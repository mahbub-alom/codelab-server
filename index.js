const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

app.use(cors());
app.use(express.json());

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

    app.get("/getUser", async (req, res) => {
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

    app.put("/updateUser/:id", async (req, res) => {
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

    app.post("/classes", async (req, res) => {
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

    //after cart added 
    app.post("/carts", async (req, res) => {
      const cartData = req.body;
      const result = await cartsCollection.insertOne(cartData);
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
