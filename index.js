//setup basic expressJs server 
const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();

const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());


//database 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.odx3u2z.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const categories = client.db("dream_book").collection("categories");

//routes
app.get('/', (req, res) => {
    res.send({
        server: 'running',
        success: true,
        message: 'server is running'
    })
})

app.get('/categories', async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 0;
    const result = await categories.find({}).limit(limit).toArray();
    console.log(result);
    res.send(result);
})






//listen
app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})