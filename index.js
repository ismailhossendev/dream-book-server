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

//manage categories

//get all categories
app.get('/categories', async (req, res) => {
    const limit = req.query.limit ? parseInt(req.query.limit) : 0;
    const result = await categories.find({}).limit(limit).toArray();
    res.send(result);
})

//get single category
app.get('/category/:id', async (req, res) => {
    const id = req.params.id;
    const category = await categories.findOne({ _id: ObjectId(id) });

    const filter = { category: category.name, status: "Available" };
    const result = await products.find(filter).toArray();
    res.send(result);
});




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

    user.verified = false;
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
    product.status = "Available";
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

//get products
app.get('/products', async (req, res) => {
    let filter = {};
    if (req.query.ads) {
        filter = { ads: true, }
    }
    filter.status = "Available"
    const result = await products.find(filter).toArray();
    res.send(result);
});

//get product details 
app.get('/product/:id', async (req, res) => {
    const id = req.params.id;
    const result = await products.findOne({ _id: ObjectId(id) });
    res.send(result);
});


// my products
app.get('/my-products', async (req, res) => {
    const email = req.query.email;
    const result = await products.find({ sellerEmail: email }).toArray();
    res.send(result);
});


//book a product 

app.put('/book', async (req, res) => {
    const id = req.query.id;
    const details = req.body;
    const filter = { _id: ObjectId(id) };
    const option = { upsert: true };
    const update = {
        $set: {
            status: "Booked",
            buyerName: details.buyerName,
            buyerEmail: details.buyerEmail,
            buyerPhone: details.buyerPhone,
            meetingPoint: details.meetingPoint,
        }
    };
    const result = await products.updateOne(filter, update, option);
    if (result.modifiedCount) {
        res.send({
            success: true,
            message: 'Book booked successfully'
        })
    }
    else {
        res.send({
            success: false,
            message: 'Book not booked'
        })
    }
})




//listen
app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})