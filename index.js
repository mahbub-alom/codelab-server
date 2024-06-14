const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const jwt = require("jsonwebtoken");

app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization=req.headers.authorization;
  if(!authorization){
    return res.status(401).send({message:"forbidden access"})
  }
  const token=authorization.split(" ")[1]
  jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
    if(err){
      res.status(401).send({message:"forbidden access"})
    }
    req.decoded=decoded;
    next()
  })
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qud1tkv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db("codelab").collection("user");
    const classCollection = client.db("codelab").collection("class");
    const reviewCollection = client.db("codelab").collection("review");
    const cartsCollection = client.db("codelab").collection("carts");
    const paymentCollection = client.db("codelab").collection("payment");

    //jwt
    app.post("/jwt", (req, res) => {
      const data = req.body;
      const token = jwt.sign(data, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    //reviews
    app.get("/review", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    //user related
    app.post("/postUser", async (req, res) => {
      const data = req.body;
      const result = await userCollection.insertOne(data);
      res.send(result);
    });

    app.get("/getUser",verifyJWT, async (req, res) => {
      const user = req?.query?.email;
      let query = {};
      if (user) {
        query = { email: user };
      }
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/getSingleUser/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await userCollection.find(filter).toArray();
      res.send(result);
    });

    app.put("/updateUser/:id",verifyJWT, async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updatedData = {
        $set: {
          name: data.userName,
          userPhone: data.userPhone,
          email: data.userEmail,
          userAddress: data.userAddress,
        },
      };
      const result = await userCollection.updateOne(
        filter,
        updatedData,
        options
      );
      res.send(result);
    });

    //class related

    app.post("/classes",verifyJWT, async (req, res) => {
      const classData = req.body;
      const result = await classCollection.insertOne(classData);
      res.send(result);
    });

    app.get("/getClass", async (req, res) => {
      const user = req?.query?.email;
      let query = {};
      if (user) {
        query = { instructorEmail: user };
      }
      const result = await classCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/getAllClass", async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    });

    app.get("/getSingleClass/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await classCollection.find(filter).toArray();
      res.send(result);
    });

    app.patch("/classes/update",verifyJWT, async (req, res) => {
      const cls = req.body.classData;
      const filter = { _id: new ObjectId(cls?.classId) };
      const updateDoc = {
        $set: {
          className: `${cls?.className}`,
          classImage: `${cls?.classImage}`,
          availableSeats: `${cls?.availableSeats}`,
          price: `${cls?.price}`,
        },
      };

      const result = await classCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/removeClass/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await classCollection.deleteOne(filter);
      res.send(result);
    });

    //after cart added
    app.post("/carts", async (req, res) => {
      const cartData = req.body;
      const result = await cartsCollection.insertOne(cartData);
      res.send(result);
    });

    app.get("/getCarts", async (req, res) => {
      const user = req?.query?.email;
      let query = {};
      if (user) {
        query = { email: user };
      }
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });

    app.delete("/classes/selected", async (req, res) => {
      // const id = req.query.id;
      const email = req?.query?.email;
      const query = { email: email };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });

    // payment methods stripe
    app.post("/create-payment-intent", async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: "usd",
        payment_method_types: ["card"],
      });

      res.send({
        clientSecret: paymentIntent.client_secret,
      });
    });

    app.post("/payments",verifyJWT, async (req, res) => {
      const payment = req.body;
      const filter = { _id: new ObjectId(payment._id) };
      const oldClass = await classCollection.findOne(filter);

      const newSeat = parseFloat(oldClass?.availableSeats) - 1;
      const newTotalEnrolled = parseFloat(oldClass?.totalEnrolled) + 1;

      const updateDoc = {
        $set: {
          availableSeats: `${newSeat}`,
          totalEnrolled: `${newTotalEnrolled}`,
        },
      };
      const updateResult = await classCollection.updateOne(filter, updateDoc);

      const postResult = await paymentCollection.insertOne(payment);
      res.send({ postResult, updateResult });
    });

    app.get("/payments/enrolled/student", async (req, res) => {
      const email = req.query.email;
      const filter = { instructorEmail: email };
      const result = await paymentCollection.find(filter).toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send("code lab server running");
});

app.listen(port, () => {
  console.log(`code lab server running on port ${port}`);
});
