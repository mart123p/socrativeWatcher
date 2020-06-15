# Socrative Watcher
So you just took a class that takes attendance with Socrative quizzes?
It turns out we are in the same situation. This NodeJS app will help you solve this problem.
It checks when the room is open based on the Socrative API. It can check for an unlimited number of rooms.

## How does it work?
Nothing fancy here! It checks every 10 seconds if the room is open. It will only
check during the time of class. You will be alerted via an SMS so you can quickly
join the room to answer the quiz. It sends SMS using Twilio.
