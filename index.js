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
        const assignmentCollection = client.db('courceDB').collection('assignments');
        const submitCollection = client.db('courceDB').collection('submit');
        const reviewCollection = client.db('courceDB').collection('reviews');

        // jwt web token apis start

        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        });


        // token middleware start

        const verifyToken = (req, res, next) => {
            console.log('Inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'Unauthorized request' });
            }
            const token = req.headers.authorization.split(' ')[1];

            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Unauthorized request' });
                }
                req.decoded = decoded;
                next();
            })
        };


        //  use verify admin after verify token

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role == 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'Unauthorized request' });
            }
            next();

        };

        // token middleware end


        app.get('/classes', async (req, res) => {
            // const email = req.query.email;
            // const query = {email: email};
            const result = await courseCollection.find().toArray();
            res.send(result);
        });

        app.get('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await courseCollection.findOne(query);
            res.send(result);
        });

        app.get('/class/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await courseCollection.find(query).toArray();
            res.send(result);
        });


        app.get('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await courseCollection.findOne(query);
            res.send(result);
        });

        app.delete('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await courseCollection.deleteOne(query);
            res.send(result);
        });


        app.post('/classes', async (req, res) => {
            const newClass = req.body;
            const result = await courseCollection.insertOne(newClass);
            res.send(result);
        });

        app.patch('/classes/approve/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await courseCollection.updateOne(query, { $set: { status: 'approve' } });
            res.send(result);
        });
        app.patch('/classes/rejected/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await courseCollection.updateOne(query, { $set: { status: 'rejected' } });
            res.send(result);
        });

        app.patch('/classes/:id', async (req, res) => {
            const data = req.body;
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    ...data,
                }
            };
            try {
                const result = await courseCollection.updateOne(filter, updatedDoc, options);
                res.send(result);
            } catch (error) {
                console.error("Error updating class:", error);
                res.status(500).send("Failed to update class.");
            }
        });


        // teachers apis
        app.get('/teachers', async (req, res) => {
            const result = await TeacherApplicationCollection.find().toArray();
            res.send(result);
        });

        app.get('/teachers/position/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'Unauthorized request' });
            }

            const query = { email: email };
            const user = await TeacherApplicationCollection.findOne(query);
            let position = false;
            if (user) {
                position = user?.position === 'teacher';
            }
            res.send({ position });
        });


        app.patch('/teachers/approved/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    status: 'approved',
                    position: 'teacher'
                }
            };
            const result = await TeacherApplicationCollection.updateOne(filter, updatedDoc, options);
            res.send(result);

        });

        app.patch('/teachers/reject/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    status: 'Reject',
                }
            };
            const result = await TeacherApplicationCollection.updateOne(filter, updatedDoc, options);
            res.send(result);

        });




        app.post('/teachers', async (req, res) => {
            const teacher = req.body;
            const result = await TeacherApplicationCollection.insertOne(teacher);
            res.send(result);
        });


        // Assignment apis

        app.get('/assignments', async (req, res) => {
            const result = await assignmentCollection.find().toArray();
            res.send(result);
        });

        app.post('/assignments', async (req, res) => {
            const assignment = req.body;
            const result = await assignmentCollection.insertOne(assignment);
            res.send(result);
        });


        // assignment submit apis

        app.get('/submit', async (req, res) => {
            const result = await submitCollection.find().toArray();
            res.send(result);
        });

        app.post('/submit', async (req, res) => {
            const submit = req.body;
            const result = await submitCollection.insertOne(submit);
            res.send(result);
        });

        // review apis

        app.get('/review', async (req, res) => {
            const result = await reviewCollection.find().toArray();
            res.send(result);
        });

        app.post('/review', async (req, res) => {
            const review = req.body;
            const result = await reviewCollection.insertOne(review);
            res.send(result);
        });

        // enroll carts list 

        app.get('/carts', async (req, res) => {
            const result = await cartCollection.find().toArray();
            res.send(result);
         });

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
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await userCollection.findOne(query);
            res.send(result);
        });

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query);
            res.send(result);
        });

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

        // make sure the admin api

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'Unauthorized request' });
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        });

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            };
            const result = await userCollection.updateOne(filter, updatedDoc);
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