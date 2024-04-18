const LOG_REST = true // logging of all REST calls
const SUCCESS = "success" // response in case of successful operation
const port = 7007

const ws = require('ws');
const express = require('express')
const app = express()
const cors = require('cors')
const Datastore = require('nedb')
const bodyParser = require('body-parser')
app.use(bodyParser.json())
app.use(express.static(__dirname+'/react/public'));

let logger = (req, res, next) => {
    let method = req.method;
    let url = req.url;
    let body = JSON.stringify(req.body);
    let status = res.statusCode;
    console.log(`${method} ${url} ${body} ${status}`);
    next();
};

if (LOG_REST) app.use(logger);
app.use(cors())

const db = {};
db.books = new Datastore({filename: 'books.db', autoload: true});
db.selections = new Datastore({filename: 'selections.db', autoload: true});

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

app.post('/books', async (req, res) => {
    console.log(req.body)
    db.books.find({title: req.body.title, author: req.body.author}, function (err, docs) {
        if (docs.length > 0) {
            if (err) {
                res.send({err})
            } else {
                res.send({err: "BookInSelection with the same title and author already exists"})
            }
        } else {
            db.books.insert(req.body, function (err, newDocs) {
                if (err) {
                    // client.send({event: "bookAdded", body: req.body});
                    // sendToAll(req.body)
                    res.send({err})
                } else {
                    res.send(newDocs)
                }
            })
        }
    })
})

app.put('/books', async (req, res) => {
    console.log(req.body)
    db.books.update({_id: req.query.id}, req.body, function (err, numReplaced) {
        if (err) {
            res.send({err})
        } else {
            res.send(SUCCESS)
        }
    })
})

app.get('/books/:id', async (req, res) => {
    db.books.find({_id: req.params.id}, function (err, docs) {
        if (err) {
            res.send({err})
        } else {
            res.send(docs[0])
        }
    })
})

app.get('/books', async (req, res) => {
    db.books.find(req.query, function (err, docs) {
        if (err) {
            res.send({err})
        } else {
            res.send(docs)
        }
    })
})

app.delete('/books/:id', async (req, res) => {
    db.selections.find({books: { $in: [req.params.id]}}, (err, docs) => {
        if (docs.length>0) {
            console.log("Can't be removed: book is used in selection "+docs[0].title)
            res.send({err: "Can't be removed: book is used in selection "+docs[0].title})
        } else {
            db.books.remove({_id: req.params.id}, {}, err => {
                if (err) {
                    res.send({err})
                } else {
                    res.send(SUCCESS)
                }
            })
        }
    })
})

app.post('/selections', async (req, res) => {
    console.log(req.body)
    db.selections.insert(req.body, function (err, newDocs) {
        if (err) {
            res.send({err})
        } else {
            res.send(SUCCESS)
        }
    })
})

app.put('/selections/:id', async (req, res) => {
    console.log(req.body)
    db.selections.update({_id: req.params.id}, req.body, function (err, newDocs) {
        if (err) {
            res.send({err})
        } else {
            res.send(SUCCESS)
        }
    })
})

app.post('/selections/:id/books', async (req, res) => {
    db.selections.update({_id: req.params.id},
        { $addToSet: {books: req.body} }, function (err) {
        if (err) {
            res.send({err})
        } else {
            res.send(SUCCESS)
        }
    })
})

app.delete('/selections/:id/books/:book_id', async (req, res) => {
    db.selections.update({_id: req.params.id},
        { $pull: {books: req.params.book_id} }, err => {
            if (err) {
                res.send({err})
            } else {
                res.send(SUCCESS)
            }
    })
})

app.delete('/selections/:id', async (req, res) => {
    db.selections.remove({_id: req.params.id},{}, err => {
            if (err) {
                res.send({err})
            } else {
                res.send(SUCCESS)
            }
    })
})

app.get('/selections', async (req, res) => {
    db.selections.find(req.query, function (err, docs) {
        if (err) {
            res.send({err})
        } else {
            res.send(docs)
        }
    })
})

app.get('/', (req, res) => {
    res.send('This is a book server!')
})

app.listen(port, () => {
    console.log(`Book server is listening at http://localhost:${port}`)
})

// connected clients
var clients = {};
let ID = 0;

// WebSocket-serve on 8081 port
var webSocketServer = new ws.WebSocketServer({port: 8081});
function sendToAll(message) {
    for(var key in clients) {
        clients[key].send(message);
    }
}
webSocketServer.on('connection', function(ws) {
    var id = ID++;
    clients[id] = ws;
    console.log("new connection " + id);

    ws.on('close', function() {
        console.log('connection closed ' + id);
        delete clients[id];
    });

});
