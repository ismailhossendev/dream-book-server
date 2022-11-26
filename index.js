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
const reports = client.db("dream_book").collection("reports");

//routes
app.get('/', (req, res) => {
    res.send({
        server: 'running',
        success: true,
        message: 'server is running'
    })
})



//reports

//crete report 
app.post('/report', async (req, res) => {
    const report = req.body;
    const alreadyReported = await reports.findOne({ productId: report.productId });
    if (alreadyReported) {
        return res.send({
            success: false,
            message: 'already reported'
        })
    }
    const result = await reports.insertOne(report);
    if (result.insertedId) {
        res.send({
            success: true,
            message: 'report sent successfully'
        })
    } else {
        res.send({
            success: false,
            message: 'report not sent'
        })
    }
})
// get all reports
app.get('/reports', async (req, res) => {
    const result = await reports.find({}).toArray();
    res.send(result);
});
//delete reported product
app.delete('/reports', async (req, res) => {
    const id = req.query.id;
    let success;

    if (id) {
        const result = await products.deleteOne({ _id: ObjectId(id) });
        if (result.deletedCount) {
            success = true;
        }
    }
    if (req.query.reportId) {
        const result2 = await reports.deleteOne({ _id: ObjectId(req.query.reportId) });
        if (result2.deletedCount) {
            success = true;
        }
    }
    if (success) {
        res.send({
            success: true,
            message: ' deleted successfully'
        })
    }
    else {
        res.send({
            success: false,
            message: 'Not deleted'
        })
    }

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

    const filter = { category: category.name, status: { $ne: "Paid" } };
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
    const alreadyExist = await users.findOne({ email: user.email });
    if (alreadyExist) {
        return res.send({
            success: false,
            message: 'User already exist'
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

//create user with google
app.post('/google', async (req, res) => {
    const user = req.body;

    if (user.role === 'admin') {
        return res.status(403).send({
            success: false,
            message: 'User not created'
        })
    }
    const alreadyExist = await users.findOne({ email: user.email });
    if (alreadyExist) {
        return res.send({
            success: false,
            message: 'Successfully logged in'
        })
    }
    user.verified = false;
    const result = await users.insertOne(user);
    if (result.insertedId) {
        res.send({
            success: true,
            message: 'User created successfully'
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
    let filter = { status: { $ne: "Paid" } };
    if (req.query.ads) {
        filter = { ads: true, }
    }
    // filter.status = "Available"
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

app.post('/book', async (req, res) => {
    const id = req.query.id;
    const details = req.body;
    console.log(details);
    const filter = { _id: ObjectId(id) };
    const option = { upsert: true };
    const update = {
        $set: details
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

// get booked products
app.get('/booked-products', async (req, res) => {
    const email = req.query.email;
    const result = await products.find({ buyerEmail: email }).toArray();
    res.send(result);
})



//listen
app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})