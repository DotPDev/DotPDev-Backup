var AWS = require('aws-sdk');
var admin = require("firebase-admin");
var fs = require('fs');
var schedule = require('node-schedule');

function init() {
    //Let's do a backup right now, just to ensure startup logic is working.
    backDemDataUp();
}

//Firebase setup
var firebaseServiceAccount = require("./dotpSecKey.json");
admin.initializeApp({
  credential: admin.credential.cert(firebaseServiceAccount),
  databaseURL: "https://defenseofthepatience-b2b5f.firebaseio.com"
});
var db = admin.database();
var ref = db.ref('/');

//AWS setup
var s3BucketName = "dotp";
var s3AccessKey = "AKIAJXAWPZ2NKOYGE23Q";
var s3SecretKey = "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";
var awsRegion = "us-west-2";
var filenamePrefix = "firebase-";
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
