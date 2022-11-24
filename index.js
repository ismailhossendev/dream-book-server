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
const users = client.db("dream_book").collection("users");
const products = client.db("dream_book").collection("products");

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
    res.send(result);
})

//manage users

//create user
app.post('/users', async (req, res) => {
    const user = req.body;

    if (user.role === 'admin') {
        return res.status(403).send({
            success: false,
            message: 'User not created'
        })
    }

    const result = await users.insertOne(user);
    if (result.insertedId) {
        res.send({
            success: true,
            message: 'user created successfully'
        })
    } else {
        res.send({
            success: false,
            message: 'User not created'
        })
    }
});

//get user details
app.get('/user', async (req, res) => {
    const email = req.query.email;
    const result = await users.findOne({ email: email });
    if (result) {
        result.name = result.firstName + ' ' + result.lastName;
    }
    res.send(result);
});


//manage products

//create product
app.post('/products', async (req, res) => {
    const product = req.body;
    const result = await products.insertOne(product);
    if (result.insertedId) {
        res.send({
            success: true,
            message: 'product created successfully'
        })
    }
    else {
        res.send({
            success: false,
            message: 'product not created'
        })
    }
});





//listen
app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})