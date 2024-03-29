const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const express = require("express");
const cors = require("cors");
const app = express();
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const port = process.env.PORT || 5000;

// app.use(cors({
//   origin: ['http://localhost:5173'],
//   credentials: true
// }));

// const corsOptions = {
//   origin: "http://localhost:3000",
//   credentials: true, //access-control-allow-credentials:true
//   optionSuccessStatus: 200,
// };
// app.use(cors(corsOptions));

//middlewares
app.use(
  cors({
    origin: [
      "https://car-doctor-1eef5.web.app",
      "https://car-doctor-1eef5.firebaseapp.com",
    ],
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    credentials: true,
    optionsSuccessStatus: 200,
  })
);
app.use(express.json());
app.use(cookieParser());

//middlewares create by me:-
const logger = async (req, res, next) => {
  // console.log("called", req.host, req.originalUrl);
  next();
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).send({ message: "not authorized" });
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.user = decoded;
    next();
  });
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

    const servicesCollection = client.db("carsDoctor").collection("services");
    const bookingCollection = client.db("carsDoctor").collection("booking");

    //jwt related api
    //   app.post('/jwt', async (req, res) => {
    //     const user = req.body;

    //     const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    //         expiresIn: '1h'
    //     });

    //     res
    //         .cookie('token', token, {
    //             httpOnly: true,
    //             secure: false
    //         })
    //         .send({ success: true })
    // })

    //jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res
        .cookie("token", token, {
          httpOnly: true,
          secure: true,
        })
        .send({ success: true });
    });

    app.post("/logOut", async (req, res) => {
      const user = req.body;
      // console.log("sign Out Users", user);
      res.clearCookie("token", { maxAge: 0 }).send({ success: true });
    });

    //service related api
    app.get("/services", async (req, res) => {
      const result = await servicesCollection.find().toArray();
      res.send(result);
    });

    app.get("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, price: 1, service_id: 1, img: 1 },
      };
      const result = await servicesCollection.findOne(query, options);
      res.send(result);
    });

    //booking collection
    app.post("/booking", async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    });

    // app.get("/booking", async (req, res) => {
    //   let query = {};
    //   if (req.query?.email) {
    //     query = { email: req.query.email };
    //   }
    //   const result = await bookingCollection.find(query).toArray();
    //   res.send(result);
    // });

    app.get("/booking", verifyToken, async (req, res) => {
      // console.log("ttttt token", req.cookies.token);
      // console.log("user in the value token", req.user);

      if (req.query.email !== req.user.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      let query = {};
      if (req.query?.email) {
        query = { email: req.query.email };
      }
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    });

    app.delete("/booking/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    });

    app.patch("/booking/:id", async (req, res) => {
      const updateBooking = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: updateBooking.status,
        },
      };
      const result = await bookingCollection.updateOne(filter, updateDoc);
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

app.get("/", (req, res) => {
  res.send("doctor server coming soon");
});

app.listen(port, () => {
  console.log(`server running on port ${port}`);
});
