//setup basic expressJs server 
const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');


const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());


//database 
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.odx3u2z.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const categories = client.db("dream_book").collection("categories");
const users = client.db("dream_book").collection("users");
const products = client.db("dream_book").collection("products");
const reports = client.db("dream_book").collection("reports");
const reviews = client.db("dream_book").collection("reviews");
const payments = client.db('dream_book').collection('payments');

//routes
app.get('/', (req, res) => {
    res.send({
        server: 'running',
        success: true,
        message: 'server is running'
    })
})


//manage json web token

//create jwt get method 
app.get('/jwt', (req, res) => {
    const email = req.query.email;
    const token = jwt.sign({ email: email }, process.env.JWT_SECRET);
    res.send({ token: token });
});


//verify jwt 
const verifyToken = (req, res, next) => {
    const bearerHeader = req.headers.authorization;
    if (!bearerHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = bearerHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).send({ message: 'access forbidden' });
        }
        req.email = decoded.email;
        next();
    });

};

// admin verify token
const verifyAdmin = async (req, res, next) => {
    const email = req.email;
    const result = await users.findOne({ email: email });
    if (result.role !== "admin") {
        return res.status(401).send({ message: "access forbidden" });
    }
    next();
};

// verify seller 
const verifySeller = async (req, res, next) => {
    const email = req.email;
    const result = await users.findOne({ email: email });
    if (result.role !== "seller") {
        return res.status(401).send({ message: "access forbidden" });
    }
    next();
};

// verify buyer 
const verifyBuyer = async (req, res, next) => {
    const email = req.email;
    const result = await users.findOne({ email: email });
    if (result.role !== "buyer") {
        return res.status(401).send({ message: "access forbidden" });
    }
    next();
};


// manage payment 
//crate payment intent
app.post('/create-payment-intent', async (req, res) => {
    const product = req.body;
    const price = Number(product.price);
    const amount = price * 100;

    const paymentIntent = await stripe.paymentIntents.create({
        currency: 'USD',
        amount: amount,
        "payment_method_types": [
            "card"
        ]
    });
    console.log(price);
    console.log(paymentIntent.clientSecret);
    res.send({
        clientSecret: paymentIntent.client_secret,

    });
});

//payment success
app.post('/payments', async (req, res) => {
    const payment = req.body;
    const result = await payments.insertOne(payment);
    const id = payment.productId;
    const filter = { _id: ObjectId(id) }
    const updatedDoc = {
        $set: {
            status: "Paid",
            ads: false,
            transactionId: payment.transactionId
        }
    }
    const updatedResult = await products.updateOne(filter, updatedDoc);
    if (updatedResult.modifiedCount) {
        res.send({
            success: true,

            message: 'payment success'
        })
    } else {
        res.send({
            success: false,
            message: 'payment failed'
        })
    }
})






//reports

//crete report 
app.post('/report', async (req, res) => {
    const report = req.body;

    if (!report.reporterName) {
        res.send({
            success: false,
            message: 'Please Login First'
        })
    }

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
app.get('/reports', verifyToken, verifyAdmin, async (req, res) => {
    const result = await reports.find({}).toArray();
    res.send(result);
});

//delete reported product
app.delete('/reports', verifyToken, verifyAdmin, async (req, res) => {
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
app.get('/category/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const isUser = await users.findOne({ email: req.email });
    if (!isUser) {
        return res.send({
            success: false,
            message: 'You are not a user or access blocked'
        })
    }


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

//update user photo
app.put('/upload-profile', async (req, res) => {
    const email = req.query.email;
    const profile = req.query.profile;
    const update = { $set: { profile: profile } };
    const option = { upsert: true };
    const result = await users.updateOne({ email: email }, update, option);
    if (result.modifiedCount) {
        res.send({
            success: true,
            message: 'profile updated successfully'
        })
    } else {
        res.send({
            success: false,
            message: 'Something went wrong'
        })
    }
})

// verify seller
app.patch('/seller-verify', verifyToken, verifyAdmin, async (req, res) => {
    const email = req.query.email;
    const update = { $set: { verified: true } };
    const result = await users.updateOne({ email: email }, update);
    if (result.modifiedCount) {
        res.send({
            success: true,
            message: 'Seller verified successfully'
        })
    } else {
        res.send({
            success: false,
            message: 'Something went wrong'
        })
    }
})

//get all users
app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
    const filter = { role: req.query.role };
    const result = await users.find(filter).toArray();
    res.send(result);
})

// delete user
app.delete('/users', verifyToken, verifyAdmin, async (req, res) => {
    const email = req.query.email;
    const result = await users.deleteOne({ email: email });
    if (result.deletedCount) {
        res.send({
            success: true,
            message: 'User deleted successfully'
        })
    } else {
        res.send({
            success: false,
            message: 'Something went wrong'
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
            success: true,
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
app.post('/products', verifyToken, verifySeller, async (req, res) => {
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
    let filter = { status: { $ne: "Paid" }, ads: true };
    const result = await products.find(filter).toArray();
    res.send(result);
});


// my products
app.get('/my-products', verifyToken, verifySeller, async (req, res) => {
    const email = req.query.email;
    if (email !== req.email) {
        return res.send({
            success: false,
            message: 'You are not authorized'
        })
    }
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

// get booked products (my orders)
app.get('/booked-products', verifyToken, verifyBuyer, async (req, res) => {
    const email = req.query.email;
    if (email !== req.email) {
        return res.send({
            success: false,
            message: 'You are not authorized'
        })
    }
    const result = await products.find({ buyerEmail: email }).toArray();
    res.send(result);
})

// run ad 
app.patch('/run-ad', verifyToken, verifySeller, async (req, res) => {
    const id = req.query.id;
    const filter = { _id: ObjectId(id) };
    const update = { $set: { ads: true } };
    const result = await products.updateOne(filter, update);
    if (result.modifiedCount) {
        res.send({
            success: true,
            message: 'Ad run successfully'
        })
    } else {
        res.send({
            success: false,
            message: 'Something went wrong'
        })
    }
});

// seller delete product 
app.delete('/products', verifyToken, verifySeller, async (req, res) => {
    const id = req.query.id;
    const result = await products.deleteOne({ _id: ObjectId(id) });
    if (result.deletedCount) {
        res.send({
            success: true,
            message: 'Product deleted successfully'
        })
    } else {
        res.send({
            success: false,
            message: 'Something went wrong'
        })
    }
});

// manage review 
app.get('/reviews', async (req, res) => {
    const result = await reviews.find({}).toArray();
    res.send(result);
});

//listen
app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})