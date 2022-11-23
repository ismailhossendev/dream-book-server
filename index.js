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
const appointmentOptions = client.db("drivingPortal").collection("appointmentOptions");

//routes
app.get('/', (req, res) => {
    res.send({
        server: 'running',
        success: true,
        message: 'server is running'
    })
})



//listen
app.listen(port, () => {
    console.log(`server is running on port ${port}`)
})