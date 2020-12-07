//This is an implementation for a musical virtual instrument using P5LiveMedia, ML5 and Tone libraries
//Hexagon grid inspired on Hex Map sketch found here https://editor.p5js.org/FirstProphet/sketches/SJR6ZKhd7

//Object for storing videos from peers
let otherVideos = {};
//My video capture
let myVideo;
//Posenet model
let poseNet;
//Array for storing poses
let poses = [];
//This is for initialize audio engine
let flag = false;

//Synths and effects
let player;
let gain;

let player2;
let gain2;

let bgPlayer;
let bgGain;

let oldNear = undefined;
let theirOldNear = undefined;


//Live media instance
let p5l;

//This may change it's for others inncoming pose
let otherX, otherY;



//Hexagons variables
let r, s;
let hexagons;

let notes = ["C8", "F8", "C7", "F7", "C6", "F6", "C5", "F5", "C4", "F4", "C3", "F3", "C2", "F2", "D8", "G8", "D7", "G7", "D7", "G6", "D5", "G5", "D4", "G4", "D3", "G3", "D2", "G2", "E8", "A8", "E7", "A7", "E6", "A6", "E5", "A5", "E4", "A4", "E3", "A3", "E2", "A2"]

let role;

function setup() {
    const myCanvas = createCanvas(1000, 720);
    //Link to div
    myCanvas.parent("canvas-container");

    //Audio deactivated maybe we want to? 显示屏幕的时候，屏蔽声音，只打开画面
    let constraints = { audio: false, video: true };

    //Initialize capture and listeners for streams and data incoming
    //this = 这个skecth上所有的
    // capture = type, room = stream, host shared space?
    // class p5LiveMedia {
    // constructor(sketch, type, elem, room, host) {
    //     this.sketch = sketch;


    myVideo = createCapture(constraints,
        function (stream) {
            p5l = new p5LiveMedia(this, "CAPTURE", stream, "Shared Space")
            //event Listener
            // 
            p5l.on('stream', gotStream);
            p5l.on('disconnect', gotDisconnect)

            p5l.on('data', gotData);
        });

    //mute my video
    myVideo.elt.muted = true;
    //not showing preview 
    myVideo.hide();
    //Initialize posenet model over my video
    poseNet = ml5.poseNet(myVideo, modelReady);

    //Execute function when new pose arrive
    poseNet.on('pose', newPose);

    //Radius, size and array for hexagons
    r = 50;
    s = sqrt(3 * pow(r, 2) / 4);
    hexagons = [];

    // create hexagons,并且分配名字，从0，1，2，3，放进hexagon的arra: hexagons = [];
    let counter = 0;
    //for loop, 只画画面的一般 y<height/4 + s
    for (let y = 0; y < height / 4 + s; y += 2 * s) {
        for (let x = 0; x < width + r; x += 3 * r) {
            //六边形交错的两行中的第一行
            hexagons.push(new Hexagon(x, y + 300, r, counter++, false));
            //六边形交错的两行中的第二行
            hexagons.push(new Hexagon(x + 1.5 * r, y + s + 300, r, counter++, false));
        }
    }

}

function draw() {

    //This is the flag for showing the user prompt¿ in order to initialize Audio Context
    //flag是一个布尔运算，先设置关门，所以要画黑色罩布
    if (!flag) {

        fill(0);
        rect(0, 0, width, height);
        fill(255);
        textSize(50);
        textAlign(CENTER, CENTER);
        text('Click to start', width / 2, height / 2);

    } else {
        //flip canvas for mirroring and tint red for my video
        // push和pop，是只在这个范围内做镜像修改
        push();
        //滤镜
        tint(22, 70, 63, 125);
        translate(width, 0);
        scale(-1, 1);
        //map image到大尺寸上
        image(myVideo, 0, 0, width, height);

        //Drawing other videos with a blue tint
        for (const id in otherVideos) {
            tint(22, 70, 63, 125);
            image(otherVideos[id], 0, 0, width, height);
        }
        //如果flag是true，门打开了，绘制六边形
        if (flag) {
            hexagons.forEach(h => {
                h.render();
            });
        }
        pop();
    }
}

//When model is loaded
function modelReady() {
    select('#status').html('Model Loaded');
}

function mouseClicked() {
    // 因为最后一行写着flag是true，所以每次mouseClick最后都是true，不会再关门
    //Start audio once when mouse is clicked
    if (!flag) {
        //A  synth
        //amplify 扩音器，调节音量
        gain = new Tone.Gain(0.2).toMaster();
        gain2 = new Tone.Gain(0.2).toMaster();
        bgGain = new Tone.Gain(0.6).toMaster();

        //音效，音效和音量连接
        let effect1 = new Tone.PingPongDelay("8n", 0.6, 0.5).connect(gain);
        let effect2 = new Tone.PingPongDelay("8n", 0.6).connect(gain2);

        //音调，和音效连接
        player = new Tone.Synth().connect(effect1);
        player2 = new Tone.Synth().connect(effect2);
        //背景音乐，connect with amplify
        bgPlayer = new Tone.Player("data/song.mp3").connect(bgGain);
        // play as soon as the buffer is loaded
        bgPlayer.autostart = true;
        bgPlayer.loop = true;

        //这个部分是关于音效的变量调整，可以修改自己喜欢的类型
        let synthJSON = {
            "portamento": 0,
            "oscillator": {
                "type": "square4"
            },
            "envelope": {
                "attack": 2,
                "decay": 1,
                "sustain": 0.2,
                "release": 2
            }
        };
        //完成音量，播放play.set(调整后音效)
        player.set(synthJSON);
        player2.set(synthJSON);

        //This never is false again
        flag = true;
    }
}

function newPose(results) {
    //Variables for storing which hexagon is selected
    let nearestHexagon;
    //Storing which hexagon is selected by them

    //Variables for storing position of nose
    let nose;

    let pointX, pointY;

    //Pass the data of model to the array 
    poses = results;

    //Go over the poses array 
    for (let i = 0; i < poses.length; i++) {

        //Accesing to data from wrists
        nose = poses[i].pose.nose;

        if (nose.confidence > 0.5) {

            //map info to canvas
            pointX = map(nose.x, 0, myVideo.width, 0, width);
            pointY = map(nose.y, 0, myVideo.height, 0, height);

            //Check distance of each hexagon
            hexagons.forEach(h => {

                if (nearestHexagon === undefined || h.distanceToPoint(pointX, pointY) < nearestHexagon.distanceToPoint(pointX, pointY)) {
                    nearestHexagon = h;

                }
            });
        }
    }

    //Check if there is a new value or remains the same
    if (oldNear != nearestHexagon && nearestHexagon != undefined && flag) {
        //Select and play hexagon
        nearestHexagon.hovered = true;
        player.triggerAttackRelease(notes[nearestHexagon.name], "4n");
        oldNear = nearestHexagon
    }


    //Prepare info for sending

    let dataToSend = { x: pointX, y: pointY };
    // Send it
    p5l.send(JSON.stringify(dataToSend));


}


// We got a new stream!
function gotStream(stream, id) {
    // This is just like a video/stream from createCapture(VIDEO)
    otherVideo = stream;
    //otherVideo.id and id are the same and unique identifiers
    otherVideo.hide();

    otherVideos[id] = stream;
}

function gotDisconnect(id) {
    delete otherVideos[id];
}

//Function when data is received
function gotData(data, id) {
    //console.log(id + ":" + data);

    // If it is JSON, parse it
    let d = JSON.parse(data);
    otherX = d.x;
    otherY = d.y;

    let theirNearestHexagon = undefined;

    hexagons.forEach(h => {
        if (theirNearestHexagon === undefined || h.distanceToPoint(otherX, otherY) < theirNearestHexagon.distanceToPoint(otherX, otherY)) {
            theirNearestHexagon = h;
        }
    });

    if (theirOldNear != theirNearestHexagon && theirNearestHexagon != undefined && flag) {
        //Select and play hexagon
        theirNearestHexagon.hovered = true;
        player2.triggerAttackRelease(notes[theirNearestHexagon.name], 1);
        theirOldNear = theirNearestHexagon
    }
}

//Hexagon shape drawer
function hexagon(x, y, r) {
    beginShape();
    for (let a = 0; a < 2 * PI; a += 2 * PI / 6) {
        let x2 = cos(a) * r;
        let y2 = sin(a) * r;
        vertex(x + x2, y + y2);
    }
    endShape(CLOSE);
}
//Hexagon class
class Hexagon {
    constructor(x, y, r, name, hovered) {
        this.x = x;
        this.y = y;
        this.r = r;
        this.name = name;
        this.hovered = hovered;
        this.flag = true;
        this.alpha = 255;



    }

    render() {
        stroke(255, 10);
        //Color if it's hovered
        if (this.hovered) {

            fill(52, 86, 84, this.alpha -= 2);

            if (this.alpha <= 0) {
                this.hovered = false;
                this.alpha = 255;

            }


        } else {
            //No fill if it's hovered
            noFill();
            this.alpha = 255;

        }


        hexagon(this.x, this.y, this.r, this.hovered);

    }
    //Each one distance to point
    distanceToPoint(pointX, pointY) {
        return dist(pointX, pointY, this.x, this.y);
    }






}