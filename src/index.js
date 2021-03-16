// requirements
const express = require('express')
const http = require('http')
const path = require('path')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage } = require('./utils/messages')
const { addUser, removeUser, getUser, getUsersInRoom } = require('./utils/users')

// setup
const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT || 3000
const publicPath = path.join(__dirname, '../public')

app.use(express.static(publicPath))

// on connection
io.on('connection', (socket) => {
    console.log('new WebSocket connection')

    // listening for join event
    socket.on('join', (options, callback) => {
        // adding the user to users list
        const { error, user } = addUser({ id: socket.id, ...options })
        
        if(error) {
            return callback(error)
        }
        
        // joining the room
        socket.join(user.room)

        // emitting message for join
        socket.emit('message', generateMessage('Admin', `Welcome, ${user.username}!`))
        
        // informing users on join
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))

        // passing room information to client
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })

        callback()
    })

    // event for sending messages
    socket.on('sendMessage', (msg, callback) => {
        const user = getUser(socket.id)
        const filter = new Filter()

        // filtering the upcoming messages
        if(filter.isProfane(msg)){
            return callback('Profanity is not allowed!')
        }

        // if it's valid message, we pass it to the client
        io.to(user.room).emit('message', generateMessage(user.username, msg))
        callback()
    })

    // listening for disconnect event
    socket.on('disconnect', () => {
        // removing user from the users list
        const user = removeUser(socket.id)
        
        // if there is user, we pass its data to client and also room's data
        if(user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username} has left!`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        } 
    })

    // listening for location messages
    socket.on('sendLocation', (coords, callback) => {
        const user = getUser(socket.id)
        io.to(user.room).emit('locationMessage', generateLocationMessage(user.username, `https://google.com/maps?q=${coords.latitude},${coords.longitude}`))

        callback()
    })

})

server.listen(port, () => {
    console.log(`Server is up on port ${port}`)
})