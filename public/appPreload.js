//console.log("connected!")

//load camera
let myVideo;
let otherVideo;
let myCanvas;

let poseNet;
let pose;
let video
let w;
let noseX;
let noseY;

let notes = ["A4"]
let player;
let gain;

function setup() {
  
    myCanvas = createCanvas(640, 480);
    myVideo = createCapture(VIDEO);
    myVideo.muted = true;
    myVideo.hide();
    myCanvas.position((windowWidth - width) / 2, 100);

    //load ML5
    poseNet = ml5.poseNet(myVideo, modelLoaded);
    poseNet.on('pose', gotPoses);

    //let ssp = new SimpleSimplePeer(this,"CANVAS",myCanvas);
    // Work-around a bug introduced by using the editor.p5js.org and iFrames.  Hardcoding the room name.
    // let p5l = new p5LiveMedia(this, "CANVAS", myCanvas, "p5LiveMediaPeerTestFun");
    // p5l.on('stream', gotStream);
}

function gotPoses(poses) {
    //console.log(poses);

    if (poses.length > 0) {
        pose = poses[0].pose;
        //console.log(pose);
    }

    for (let i = 0; i < poses.length; i++) {
        let pose = poses[i].pose;
    }
}

function modelLoaded() {
    console.log('poses Ready');
}

document.getElementById('poseReady').addEventListener('click', () => {
    console.log("clicked!")
    location.replace("/index.html")
})

function draw() {
    background(11, 85, 243);

    //mirror the camera
    push();
    translate(myVideo.width, 0);
    scale(-1, 1);
    image(myVideo, 0, 0, width, height);
    pop();

    // Do the threshold 1 time in setup
    loadPixels();
    for (let i = 0; i < pixels.length; i += 4) {
        let r = pixels[i];
        let g = pixels[i + 1];
        let b = pixels[i + 2];

        if (r + b + g > 200) {
            pixels[i] = 255;
            pixels[i + 1] = 255;
            pixels[i + 2] = 255;
        } else {
            pixels[i] = 0;
            pixels[i + 1] = 0;
            pixels[i + 2] = 0;
        }
    }
    updatePixels();

   
    //poseNET
    if (pose) {
        let noseX = pose.keypoints[0].position.x
        let noseY = pose.keypoints[0].position.y

        nosePoseX = map(noseX,0,myVideo.width,0,width)
        nosePoseY = map(noseY,0,myVideo.width,0,width)

         //ellipse(mouseX, mouseY, 50, 50);
        ellipseMode(RADIUS);
        stroke(11, 85, 243);
        strokeWeight(3);
        noFill();
        //haxagon for user to match nose location
        hexagon(width/2, height/2, 50)


        noStroke();
        fill(11, 85, 243);
        circle(width-nosePoseX , nosePoseY, 20);

        textSize(20);
            noStroke();
            fill(11, 85, 243);
            text('Move nose into Hexagon', (width-nosePoseX +20), nosePoseY);
    }

    //if nose in the hexagon play sound and go to the main page
    // the end of the sound has noise, don't know how to change it??
    if (NoseDistanceCheck()) {
            fill(11, 85, 243);
            gain = new Tone.Gain(0.2).toMaster(); 
            let effect1 = new Tone.PingPongDelay("8n", 0.5, 0.2).connect(gain);
            player = new Tone.Synth().connect(effect1);

            player.triggerAttackRelease(notes[0], "4n");

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
            player.set(synthJSON);
           
            text('Ready! Go to play!',width/2-90,height/2+100);
           // console.log("Ready for next page")
            setTimeout(timeIt ,4000);
    }
}

function NoseDistanceCheck() {
    if (pose) {

        let d = dist(width-nosePoseX, nosePoseY, width/2,height/2);

        if (d < 50) {
            console.log("Nose checkdistance!!")
            return true;
        }
        console.log(d);
    }
}

function timeIt() {
    //replace
    location.replace("/index.html")
}

function hexagon(x, y, r) {
    beginShape();
    for (let a = 0; a < 2 * PI; a += 2 * PI / 6) {
        let x2 = cos(a) * r;
        let y2 = sin(a) * r;
        vertex(x + x2, y + y2);
    }
    endShape(CLOSE);
}

// function gotStream(stream) {
//     // This is just like a video/stream from createCapture(VIDEO)
//     otherVideo = stream;
//     //otherVideo.id is the unique identifier for this peer
//     //otherVideo.hide();
// }

