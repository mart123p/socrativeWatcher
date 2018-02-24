const https = require('https');
var config = require("./config.json");
const log4js = require('log4js');
log4js.configure({
    appenders: {
        fileLog: {
            type: "file",
            filename: "production.log",
            maxLogSize: 1048576,
            numBackups: 3
        },
        fileLogInfo: {
            type: 'logLevelFilter',
            appender: 'fileLog',
            level: 'info'
        },
        consoleLog:{
            type:"console"
        }
    },
    categories: {
        default: { appenders: [ "fileLogInfo","consoleLog"], level: "debug" }
    }
});


const logger = log4js.getLogger('watcher');
var date = new Date();
var regexRoom = new RegExp("^[a-z0-9\\-_]{1,}$");

//TODO Json schema validation

const client = require('twilio')(config.twilio.account_sid, config.twilio.account_token);

function socrativeWatcher(){

    function sendSMS(room){
        var sendSMS = true;
        if(room.hasOwnProperty("smsSent")){
            if(room.smsSent){
                sendSMS = false;
            }
        }
        if(sendSMS) {
            logger.info("Sending SMS to " + JSON.stringify(room.phones), room.name);
            room.phones.forEach(function(phone){
                client.messages.create({
                    to: phone,
                    from: config.twilio.phone,
                    body: "The room "+ room.name + " is now available on Socrative."
                }).then(function(message){
                    logger.info("SMS sent to "+ phone, room.name);
                });
            });
        }else{
            logger.info("SMS already sent",room.name);
        }
        room.smsSent = true;
    }
    function resetRoom(room){
        room.smsSent = false;
    }


    function isAvailable(room, callback) {
        var err;
        if(!room.match(regexRoom)){
            callback("Invalid room input",false);
        }

        https.get("https://api.socrative.com/rooms/api/current-activity/"+room, function (res) {
            var str = '';

            res.on('data', function (d) {
                str += d;
            });

            res.on('end', function () {
                if(res.statusCode === 200){
                    //We can parse the json and check if we there is some data.

                    if(str) {
                        try {
                            var json = JSON.parse(str);
                            if (Object.keys(json).length !== 0) {
                                callback(err,true);
                            } else {
                                callback(err,false);
                            }
                        }catch(e){
                            err = "Invalid json";
                            callback(err,false);
                        }
                    }else{
                        err = "Invalid input in json";
                        callback(err,false);
                    }
                }else{
                    err = "Invalid response code from socrative api.";
                    callback(err,false);
                }
            });

        }).on('error', function (e) {
            err = "Network error";
            callback(err,false);
        });
    }

    //Watcher starts here !!

    date = new Date(); //We need to update the time object
    logger.debug("tick");

    config.rooms.forEach(function(room){
        logger.debug("Checking room ",room.name);
        if(room.time.w === date.getDay()){
            //Correct date are we in the time frame?
            if(room.time.h_start <= date.getHours() && room.time.h_end >= date.getHours()){
                var minutesCorrect = true;
                if(room.time.h_end === date.getHours() && room.time.m_end < date.getMinutes()){
                    minutesCorrect = false;
                }else if(room.time.h_start === date.getHours() && room.time.m_start > date.getMinutes()){
                    minutesCorrect = false;
                }


                if(minutesCorrect) {
                        //We can check if the room is really opened
                        isAvailable(room.name, function (err, status) {
                            if (!err) {
                                if (status) {
                                    //We need to send an SMS to notify that the room was opened
                                    logger.info("Room is opened", room.name);
                                    sendSMS(room)
                                } else {
                                    logger.info("Room is closed", room.name);
                                    resetRoom(room);
                                }
                            } else {
                                logger.error(err);
                            }
                        });
                }else{
                    logger.debug("Not correct time (minutes)",room.name);
                    resetRoom(room);
                }
            }else{
                logger.debug("Not correct time (hours)",room.name);
                resetRoom(room);
            }
        }else{
            logger.debug("Not correct day",room.name);
            resetRoom(room);
        }
    });
}

//Start the watcher
logger.info("Starting Socrative Watcher");
socrativeWatcher();
setInterval(socrativeWatcher,10000);