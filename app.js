'use strict'

const express = require('express');
const fs = require('fs');
const environmentVars = require('dotenv').config();

// Google Cloud
const speech = require('@google-cloud/speech');
const speechClient = new speech.SpeechClient(); // Creates a client

var credentials = {
  key: fs.readFileSync('/etc/letsencrypt/live/shijotheshiba.fun/privkey.pem'),
  cert: fs.readFileSync('/etc/letsencrypt/live/shijotheshiba.fun/cert.pem')
};

const app = express();
const port = process.env.PORT || 1337;
const server = require('https').createServer(credentials, app);
const io = require('socket.io')(server);

app.use('/assets', express.static(__dirname + '/public'));
app.use('/session/assets', express.static(__dirname + '/public'));
app.use(express.static(__dirname + '/public'));
app.set('view engine', 'ejs');

app.get('/mic', function (req, res) {
    res.render('index', {});
});

app.get('/', function(req, res) {
  res.redirect('virtual_pet.html');
});

app.use('/', function (req, res, next) {
    next();
});

io.on('connection', function (client) {
    console.log('Client Connected to server');
    let recognizeStream = null;

    client.on('join', function (data) {
        client.emit('messages', 'Socket Connected to Server');
    });

    client.on('messages', function (data) {
        client.emit('broad', data);
    });

    client.on('startGoogleCloudStream', function (data) {
        startRecognitionStream(this, data);
    });

    client.on('endGoogleCloudStream', function (data) {
        stopRecognitionStream();
    });

    client.on('binaryData', function (data) {
        // console.log(data); //log binary data
        if (recognizeStream !== null) {
            recognizeStream.write(data);
        }
    });

    function startRecognitionStream(client, data) {
        recognizeStream = speechClient.streamingRecognize(request)
            .on('error', console.error)
            .on('data', (data) => {
                process.stdout.write(
                    (data.results[0] && data.results[0].alternatives[0])
                        ? `Transcription: ${data.results[0].alternatives[0].transcript}\n`
                        : `\n\nReached transcription time limit, press Ctrl+C\n`);
                client.broadcast.emit('speechData', data);

                // If end of utterance, restart stream
                if (data.results[0] && data.results[0].isFinal) {
                    stopRecognitionStream();
                    startRecognitionStream(client);
                }
            });
    }

    function stopRecognitionStream() {
        if (recognizeStream) {
            recognizeStream.end();
        }
        recognizeStream = null;
    }
});

// The encoding of the audio file, e.g. 'LINEAR16'
// The sample rate of the audio file in hertz, e.g. 16000
// The BCP-47 language code to use, e.g. 'en-US'

const encoding = 'LINEAR16';
const sampleRateHertz = 16000;
const languageCode = 'en-US'; //en-US

const request = {
    config: {
        encoding: encoding,
        sampleRateHertz: sampleRateHertz,
        languageCode: languageCode,
        profanityFilter: false,
        enableWordTimeOffsets: true,
        // speechContexts: [{
        //   phrases: ["hoful","shwazil"]
        // }] // Speech context for better recognition
    },
    interimResults: true // Produces interim results
};

server.listen(port, function () {
    console.log('Server started on port:' + port)
});
