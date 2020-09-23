const express = require('express')
const bodyParser = require('body-parser');
var fs = require('fs');

const { MongoClient } = require('mongodb');

const app = express()
const port = process.env.PORT || 3000;
app.use(express.static('assets'))



const DB_USER = "admin";
const PASSWORD = "qwerty123"
const dbname = 'typer'
const uri = `mongodb://admin:${PASSWORD}@typer-shard-00-00.ckxnu.mongodb.net:27017,typer-shard-00-01.ckxnu.mongodb.net:27017,typer-shard-00-02.ckxnu.mongodb.net:27017/${dbname}?ssl=true&replicaSet=atlas-z4wo1g-shard-0&authSource=admin&retryWrites=true&w=majority`;


const rand = (min, max) => Math.floor(Math.random() * (max - min) + min);

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
    let count = req.params.count;

    get_words().then(words => {
        let wordsarr = []
        for (let key of Object.keys(words)) {
            if (key != '_id') wordsarr = wordsarr.concat(words[key])

        }

        let result = []

        for (let i = 0; i < count; i++)
            result.push(wordsarr[rand(0, wordsarr.length - 1)].trim())

        res.json(JSON.stringify(result))
    })


})

app.get('/words/:count/:letter', (req, res) => {
    let count = req.params.count;
    let letter = req.params.letter;

    get_words(letter).then(words => {
        words = words[letter]
        let result = []

        for (let i = 0; i < count; i++)
            result.push(words[rand(0, words.length - 1)].trim())

        res.json(JSON.stringify(result))
    })

})


app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})
