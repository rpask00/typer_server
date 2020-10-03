const express = require('express')
const bodyParser = require('body-parser');
var fs = require('fs');
const cors = require('cors');
const socketPackage = require('socket.io');

const { MongoClient } = require('mongodb');

const app = express()
const port = process.env.PORT || 3000;
app.use(express.static('assets'))

const PASSWORD = "qwerty123"
const dbname = 'typer'
const uri = `mongodb://admin:${PASSWORD}@typer-shard-00-00.ckxnu.mongodb.net:27017,typer-shard-00-01.ckxnu.mongodb.net:27017,typer-shard-00-02.ckxnu.mongodb.net:27017/${dbname}?ssl=true&replicaSet=atlas-z4wo1g-shard-0&authSource=admin&retryWrites=true&w=majority`;

const corsFunctions = require('./cors');
const { allowCrossDomain } = require('./cors');
app.use(corsFunctions.allowCrossDomain);
app.use(cors(corsFunctions.corsOptions));


let server = app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})


const rand = (min, max) => Math.floor(Math.random() * (max - min) + min);
let io = socketPackage(server)


let players = {}


function getSocketsKeys(sockets) {
    let keys = [];
    for (let key in sockets)
        keys.push(key);
    return keys
}

function getPlayers(sockets) {
    let active_players = []

    for (let socket of getSocketsKeys(sockets)) {
        if (players[socket]) {
            active_players.push(players[socket])
        }
    }

    return active_players
}

io.on('connection', (socket) => {

    socket.on('creating-connection', data => {
        players[socket.id] = {
            socket: socket.id,
            displayName: data.displayName,
            photoURL: data.photoURL
        }

        socket.emit('me', players[socket.id])
        io.sockets.emit('players-share', getPlayers(io.sockets.connected))
    })

    socket.on('disconnect', id => {
        if (socket.id == id) socket.close()

        io.sockets.emit('players-share', getPlayers(io.sockets.connected))
    })

    socket.on('invite', data => {
        io.sockets.sockets[data.to.socket].emit('invitation', {
            from: data.from,
            sample_words: data.sample_words
        })
    })

    socket.on('reject', data => {
        io.sockets.sockets[data.from.socket].emit('game-rejected')
    })

    socket.on('accept', data => {
        io.sockets.sockets[data.to.socket].emit('game-begin', data)
        io.sockets.sockets[data.from.socket].emit('game-begin', {
            to: data.from,
            from: data.to
        })
    })

    socket.on('client-type', data => {
        io.sockets.sockets[data.from.socket].emit('server-type', data.key)
    })


    socket.on('endGame', gameInfo => {
        io.sockets.sockets[gameInfo.from.socket].emit('onEndGame', 'win')
        io.sockets.sockets[gameInfo.to.socket].emit('onEndGame', 'lose')
    })


})


async function insert_words(words_data) {
    const client = new MongoClient(uri, { useUnifiedTopology: true, useNewUrlParser: true });

    try {
        // Connect to the MongoDB cluster
        await client.connect();

        let collection = client.db('typer').collection('words')
        await collection.insertOne(words_data)



    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }
}


async function get_words(letter) {
    const client = new MongoClient(uri, { useUnifiedTopology: true, useNewUrlParser: true });
    let result
    try {
        // Connect to the MongoDB cluster
        await client.connect();

        let collection = client.db('typer').collection('words')
        if (letter)
            result = await collection.findOne({}, { 'fields': { [letter]: true } })
        else
            result = await collection.findOne({})

    } catch (e) {
        console.error(e);
    } finally {
        await client.close();
    }

    return result
}


function readWords() {
    let words = []
    let words_set = {
        'a': [],
        'b': [],
        'c': [],
        'd': [],
        'e': [],
        'f': [],
        'g': [],
        'h': [],
        'i': [],
        'j': [],
        'k': [],
        'l': [],
        'm': [],
        'n': [],
        'o': [],
        'p': [],
        'q': [],
        'r': [],
        's': [],
        't': [],
        'u': [],
        'v': [],
        'w': [],
        'x': [],
        'y': [],
        'z': [],
    }

    fs.readFile('./assets/words.txt', 'utf8', function (err, data) {
        if (err) throw err;
        words = data.split('\r')
        words.forEach(word => {
            word.split('').forEach(w => {
                if (w in words_set && words_set[w].indexOf(word) == -1)
                    words_set[w].push(word)
            })
        })
        insert_words(words_set).catch(console.error)
    });
}

app.get('/allwords/:count', (req, res) => {
    let count = req.params.count * 1;
    let minlen = count * 4 + count
    let maxlen = count * 6 + count

    get_words().then(words => {
        let wordsarr = []
        for (let key of Object.keys(words)) {
            if (key != '_id') wordsarr = wordsarr.concat(words[key])

        }
        let len = 0
        let result = []

        while (len < minlen || len > maxlen) {
            len = 0
            result = []

            for (let i = 0; i < count; i++) {
                let word = wordsarr[rand(0, wordsarr.length - 1)].trim()
                len += word.length + 1
                result.push(word)

            }

        }
        res.json(JSON.stringify(result))
    })


})

app.get('/words/:count/:currentletter/:letters', (req, res) => {
    let count = req.params.count * 1;
    let currentletter = req.params.currentletter.toLowerCase();
    let letters = new Set(req.params.letters.toLowerCase());
    let minlen = count * 4 + count
    let maxlen = count * 6 + count
    get_words(currentletter).then(words => {
        words = words[currentletter]

        let len = 0
        let result = []

        while (len < minlen || len > maxlen) {
            len = 0
            result = []

            for (let i = 0; i < count; i++) {
                let allletterscorrect = false
                let word = ''
                while (!allletterscorrect) {
                    allletterscorrect = true
                    word = words[rand(0, words.length - 1)].trim()
                    for (let letter of word.split('')) {
                        if (!letters.has(letter)) {
                            allletterscorrect = false
                            break
                        }
                    }
                }

                len += word.length + 1
                result.push(word)

            }

        }
        res.json(JSON.stringify(result))
    })

})


