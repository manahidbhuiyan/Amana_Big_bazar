$(document).ready(function(){
    var socket = io();
    socket.on('connection', (socket)=>{
        console.log('connection')
    })
})