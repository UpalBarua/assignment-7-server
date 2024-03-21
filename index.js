require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const { MongoClient, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
// app.use(cors(Credential:true));
app.use(express.json());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db("hope-sync");
    const users = db.collection("users");
    const donation = db.collection("donation");

    // User Registration
    app.post("/api/v1/register", async (req, res) => {
      const { name, email, password } = req.body;

      // Check if email already exists
      const existingUser = await users.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: "User already exists",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user into the database
      await users.insertOne({ name, email, password: hashedPassword });

      res.status(201).json({
        success: true,
        message: "User registered successfully",
      });
    });

    // User Login
    app.post("/api/v1/login", async (req, res) => {
      const { email, password } = req.body;

      // Find user by email
      const user = await users.findOne({ email });
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare hashed password
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Generate JWT token
      const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET, {
        expiresIn: process.env.EXPIRES_IN,
      });

      res.json({
        success: true,
        message: "Login successful",
        token,
      });
    });

    app.get("/api/v1/donation", async (req, res) => {
      const query = {};
      const result = await donation.find(query).toArray();
      res.send(result);
    });

    app.get("/api/v1/donation/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await donation.findOne(query);
      res.send(result);
    });

    app.post("/api/v1/donation", async (req, res) => {
      try {
        const newDonation = req.body;

        if (!newDonation) {
          return res.status(400).json({ message: "invalid new donation" });
        }

        const createdDonation = await donation.insertOne(newDonation);

        res.status(201).json(createdDonation);
      } catch (error) {
        res.status(500).json({ message: "Failed to create a new donation" });
      }
    });

    app.delete("/api/v1/delete-donation/:id", async (req, res) => {
      const id = req.params.id;
      const response = await donation.deleteOne({ _id: new ObjectId(id) });
      res.send(response);
    });

    app.put("/api/v1/update-donation/:id", async (req, res) => {
      const id = req.params.id;
      const updatedDonation = req.body;
      const query = { _id: new ObjectId(id) };
      const last = await donation.findOne(query);

      const updateDoc = {
        $set: updatedDonation,
      };
      const result = await donation.updateOne(query, updateDoc);
      res.send(result);
    });

    // Start the server
    app.listen(port, () => {
      console.log(`Server is running on http://localhost:${port}`);
    });
  } finally {
  }
}

run().catch(console.dir);

app.get("/", (req, res) => {
  const serverStatus = {
    message: "Server is running smoothly",
    timestamp: new Date(),
  };
  res.json(serverStatus);
});
