var AWS = require('aws-sdk');
var admin = require("firebase-admin");
var fs = require('fs');
var schedule = require('node-schedule');

function init() {
    //Let's do a backup right now, just to ensure startup logic is working.
    backDemDataUp();
}

//Firebase setup
if (process.env.NODE_ENV === 'dev') {
    var firebaseServiceAccount = require("../dotpSecKey.json");
    admin.initializeApp({
      credential: admin.credential.cert(firebaseServiceAccount),
      databaseURL: "https://defenseofthepatience-b2b5f.firebaseio.com"
    });
} else {
    var firebaseServiceAccount = JSON.parse(process.env.FB_CREDENTIALS);
    admin.initializeApp({
      credential: admin.credential.cert(firebaseServiceAccount),
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

//Setup Schedule using Node-Schedule for every day at 7:00
var rule = new schedule.RecurrenceRule();
rule.hour = 7;
rule.dayOfWeek = new schedule.Range(0,6);
var backupTask = schedule.scheduleJob(rule, function(){
    console.log('starting backup task for DotP');
    backDemDataUp();
});

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

init();
