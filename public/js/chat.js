const socket = io()

// Elements
const $messageForm = $('#socketForm')
const $messageFormInput = $('#message-input')
const $messageFormButton = $('#socketForm button')
const $sendLocationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')
const $roomTitle = document.querySelector('#room__title')
const $roomInfoBtn = document.querySelector('.room__info__button')
const $roomTitleL = document.querySelector('.room__title__l')

// Templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationMessageTemplate = document.querySelector('#location-message-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// Event listener for room info button
let isClicked = false

$(window).on('load', function () {
    $('.info__button__container .room__info__button').on('click', (e) => {
        e.preventDefault()
        $('body').toggleClass('animate')

        if(isClicked) {
            $roomInfoBtn.textContent = '«'
            isClicked = false
        } else {
            $roomInfoBtn.textContent = '»'
            isClicked = true
        }
    })
})

$(window).on('resize', () => {
	if($(window).width() >= 545) {
        if($('body').hasClass('animate')) {
        $('body').removeClass('animate')
        }
	}
})

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoscroll = () => {
    // New message element
    const $newMessage = $messages.lastElementChild

    // Height of the newest message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin

    // Visible height
    const visibleHeight = $messages.offsetHeight
    
    // Height of messages container
    const containerHeight = $messages.scrollHeight

    // How far have i scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight

    // If we are the bottom, we autoscroll
    if(containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}

// listening for message event on the client side
socket.on('message', (message) => {
    console.log(message)
    // rendering the upcoming data from the server to the screen
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('h:mm A')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

// listening for location message event on the client side
socket.on('locationMessage', (message) => {
    console.log(message)
    // rendering the upcoming data from the server to the screen
    const html = Mustache.render(locationMessageTemplate, {
        username: message.username,
        URL: message.URL,
        createdAt: moment(message.createdAt).format('h:mm A')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
})

// listening for room data event on the client side
socket.on('roomData', ({ room, users }) => {
    // rendering the upcoming data about the room to the screen
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })

    $roomTitle.textContent = room
    $roomTitleL.textContent = room

    document.querySelector('#sidebar').innerHTML = html
})

// listener for form submission
$messageForm.on('submit', (e) => {
    e.preventDefault()

    // disable
    $messageFormButton.attr('disabled', 'disabled')

    let msg = e.target.elements.msg.value
    // emitting message to the server
    socket.emit('sendMessage', msg, (error) => {
        // enable
        $messageFormButton.removeAttr('disabled')
        $messageFormInput.val('')
        $messageFormInput.focus((e) => {
            return
        })
        if (error) {
            return console.log(error)
        }

        console.log('Message delivered!')
    })
})

// submitting form if 'enter' key is pressed
$('#message-input').on('keydown', function(e) {
    if(e.altKey && e.keyCode === 13) {
        e.preventDefault();
        e.stopPropagation();
        $(this).val($(this).val() + "\n");
    } else if(e.keyCode === 13) {
        e.preventDefault();
        e.stopPropagation();
        $(this).parents('#socketForm').submit();      
    }
  });

document.querySelector('#send-location').addEventListener('click', (e) => {

    if(!navigator.geolocation) {
        return alert('Geolocation is not supported by your browser!')
    }

    // disable
    $sendLocationButton.setAttribute('disabled', 'disabled')

    // finding location of the user and sending it to the server
    navigator.geolocation.getCurrentPosition((position) => {
        socket.emit('sendLocation', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {
            console.log('Location shared!')
            $sendLocationButton.removeAttribute('disabled')
        })
    })
})

// emitting join event to the server
socket.emit('join', { username, room }, (error) => {
    if(error) {
        alert(error)
        location.href = '/'
    }
})