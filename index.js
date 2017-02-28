var AWS = require('aws-sdk');
var admin = require("firebase-admin");
var fs = require('fs');
var schedule = require('node-schedule');

//Firebase setup
if (process.env.NODE_ENV === 'dev') {
    var firebaseServiceAccount = require("../dotpSecKey.json");
    admin.initializeApp({
      credential: admin.credential.cert(firebaseServiceAccount),
      databaseURL: "https://defenseofthepatience-b2b5f.firebaseio.com"
    });
} else {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FB_PROJECT_ID,
            clientEmail: process.env.FB_CLIENT_EMAIL,
            privateKey: process.env.FB_PRIVATE_KEY
          }),
        databaseURL: "https://defenseofthepatience-b2b5f.firebaseio.com"
    });
}
var db = admin.database();
var ref = db.ref('/');

//AWS setup
if (process.env.NODE_ENV === 'dev') {
    var s3Creds = require("../s3CredFile.json");
    var s3BucketName = s3Creds.s3BucketName;
    var s3AccessKey = s3Creds.s3AccessKey;
    var s3SecretKey = s3Creds.s3SecretKey;
    var awsRegion = s3Creds.awsRegion;
    var filenamePrefix = "firebase-";
} else {
    var s3BucketName = process.env.S3_BUCKET_NAME;
    var s3AccessKey = process.env.S3_ACCESS_KEY;
    var s3SecretKey = process.env.S3_SECRET_KEY;
    var awsRegion = process.env.S3_AWS_REGION;
    var filenamePrefix = "firebase-";
}
AWS.config.region = awsRegion;
AWS.config.credentials = {accessKeyId: s3AccessKey, secretAccessKey: s3SecretKey};
var s3 = new AWS.S3({params: {Bucket: s3BucketName}});

//Node-Schedule for the scheduled backup job - this is every day at 12:00AM.
var backupTask = schedule.scheduleJob('00 00 12 * * 1-7', function(){
    console.log('starting backup task for DotP');
    backDemDataUp();
});

//Let's do one now, just to ensure startup is working.
backDemDataUp();

//This is the GET from firebase and the POST to AWS bucket
function backDemDataUp() {
    console.log('Starting backup...');
    ref.once("value", function(snapshot) {
      var objParam = {Key: getBackupFilename(), Body: JSON.stringify(snapshot.exportVal())};
        s3.upload(objParam, function (err, data) {
            if (err) {
                console.log(err);
            } else {
                console.log(getCurrentTime() + ": Backup uploaded");
            }
        });
    });
}

//Utilities
function getBackupFilename() {
    var now = new Date();
    return filenamePrefix + now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate() + '-' + now.getTime() + '.json';
}

function getCurrentTime() {
    var today = new Date();
    var dd = today.getDate();
    var mm = today.getMonth() + 1; //January is 0!
    var yyyy = today.getFullYear();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    return yyyy + "-" + mm + "-" + dd + " " + time;
}
