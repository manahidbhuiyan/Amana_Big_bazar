let socket = async function (io) {
    // Connection initialization
    await io.on('connection', (socket)=>{
        socket.on('order placed', ()=>{
            io.emit('order placed')
        })
    })
}

module.exports = socket