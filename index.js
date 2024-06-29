const express = require('express')
const app = express()
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);


//middleware
app.use(cors({
    origin: [
        "http://localhost:5173",
        "https://teachable-class.netlify.app"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
}));
app.use(express.json());



const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.2lraink.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        const courseCollection = client.db('courceDB').collection('allClass');
        const userCollection = client.db('courceDB').collection('users');
        const cartCollection = client.db('courceDB').collection('carts');
        const TeacherApplicationCollection = client.db('courceDB').collection('teachers');

        // jwt web token apis start

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        });

        app.get('/classes', async (req, res) => {
            const result = await courseCollection.find().toArray();
            res.send(result);
        });

        app.get('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await courseCollection.findOne(query);
            res.send(result);
        });

        // teachers apis
        app.post('/teachers', async (req, res) => {
            const teacher = req.body;
            const result = await TeacherApplicationCollection.insertOne(teacher);
            res.send(result);
        });


        // enroll carts list 

        app.get('/carts', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const result = await cartCollection.find(query).toArray();
            res.send(result);
        });

        app.get('/carts/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.findOne(query);
            res.send(result);
        });

        app.post('/carts', async (req, res) => {
            const cartItem = req.body;
            const result = await cartCollection.insertOne(cartItem);
            res.send(result);
        });

        // users list
        app.post('/users', async (req, res) => {
            const user = req.body;
            // insert email if user does not exist
            // you can do this many way
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exists', insertedId: null });
            }

            const result = await userCollection.insertOne(user);
            res.send(result);
        });


        // payment process 
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = parseInt(price * 100);
            console.log(amount, 'inside the amount');
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            });
        });




        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})