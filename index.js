const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 5000
const { MongoClient } = require('mongodb');


//server sdk file name
//()

var admin = require("firebase-admin");

var serviceAccount = require('./doctors-portal-firebase-adminsdk.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

//midleware
app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.1g7zj.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

// console.log(uri)

async function verifyToken(req, res, next){
  if(req.headers?.authorization?.startsWith('Bearer ')){
    const token = req.headers.authorization.split(' ')[1];

    try{
      const deCodedUser = await admin.auth().verifyIdToken(token)
      req.deCodedEmail = deCodedUser.email;

    }catch{

    }
  }
  next()
}

async function run(){
    try{
        await client.connect();
        const database = client.db('doctors_portal')
        const appointmentsCollection = database.collection('appointments');
        const userCollection = database.collection('users');


        app.get('/appointments', async(req, res)=>{
          const email = req.query.email
          const date = new Date(req.query.date).toLocaleDateString()
          console.log(date)
          const query = {email: email, date: date}
          const cursor = appointmentsCollection.find(query)
          const appointments = await cursor.toArray()
          res.json(appointments)
        })

        app.post('/appointments', async(req, res)=>{
          const appointment = req.body;
          const result = await appointmentsCollection.insertOne(appointment)
          res.json(result)
        })

        //get users dada by useing email
        app.get('/users/:email', async(req, res)=>{
          const email = req.params.email
          const query = {email: email}
          const user = await userCollection.findOne(query);
          let isAdmin = false;
          if(user?.role === 'admin'){
            isAdmin = true;
          }
          res.json({admin: isAdmin})
        })


        //save data in the database
        app.post('/users', async(req, res)=>{
          const user = req.body;
          const result = await userCollection.insertOne(user)
          console.log(result);
          res.json(result);
        })

        app.put('/users', async(req, res)=>{
          const user =  req.body;
          const filter = {email: user.email}
          const options = {upsert: true}
          const updateDoc = {$set: user }
          const result = await userCollection.updateOne(filter, updateDoc, options)
          res.json(result)

        })

        app.put('/users/admin', verifyToken, async(req,res)=>{
          const user = req.body;
          const requester = req.deCodedEmail
          if(requester){
            const requestAccount = await userCollection.findOne({email: requester})
            if(requestAccount.role === 'admin'){
              const filter = {email : user.email}
              const updateDoc = {$set: { role: 'admin' }}
              const result = await userCollection.updateOne(filter, updateDoc)
              res.json(result)
            }
          }

          else{
            res.status(401).json({message: 'you donot have access to make admin'})
          }
          
          
        })

    }finally{
        // await client.close();
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Hello Doctors portal server')
})

app.listen(port, () => {
  console.log(`Example app port:${port}`)
})

