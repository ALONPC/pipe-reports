require('dotenv').config()
const express = require("express");
const app = express();
const moment = require('moment');
const mysql = require('mysql');
const Pipedrive = require("pipedrive");

const TOKEN = process.env.PIPEDRIVE_TOKEN;
const PORT = process.env.PORT || 5000;

const today = moment().locale('en').format('L')
console.log("TCL: today", today)
const oneMonthAgo = moment().subtract(1, 'months').format('L')
console.log("TCL: oneMonthAgo", oneMonthAgo)

const pipedrive = new Pipedrive.Client(TOKEN, {
  strictMode: true
});

const activitiesTable = 
`
  SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
  SET time_zone = "+00:00";
  
  CREATE TABLE \`Activities\` 
  (
    \`id\` int(11) NOT NULL,
    \`done\` tinyint(1) NOT NULL,
    \`type\` varchar(50) NOT NULL,
    \`subject\` varchar(250) NOT NULL,
    \`owner_name\` varchar(250) NOT NULL,
    \`marked_as_done_time\` date DEFAULT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=latin1;
  
  ALTER TABLE \`Activities\`
    ADD PRIMARY KEY (\`id\`
  );
`;

function ConnectToMySql(){
  try{
    const mysqlcon = mysql.createConnection({
      host: 'localhost',
      user: "root",
      password: "",
      database: "Pipedrive"
    })
    mysqlcon.connect();
    return mysqlcon; 
  }
  catch(err){
    throw new Error("Couldn't connect to MySQL")
  }
}

function InsertActivities(activities){
  const con = ConnectToMySql();
  try{
    console.log("Inserting rows in MySQL database...")
    activities.forEach((activity, i) => {
      con.query('INSERT INTO Activities SET ?', activity, (error, results, fields) => {
        if(error){
          throw error
        }
      });
      // console.log(query.sql);
    })
    console.log(`Successfully inserted ${activities.length} rows`)
  } catch(err){
    throw err
  }
}

async function getActivities() {
  let start = 0;
  const limit = 500;
  let response = [];
  let newActivity;
  do {
    console.log(`Number of activities fetched: ${start}`);
    newActivity = await new Promise((resolve, reject) => {
      pipedrive.Activities.getAll(
        {
          start_date: oneMonthAgo,
          end_date: today,
          // done: 1,
          start,
          limit
        },
        (err, data) => {
          if (err !== null) return reject(err);
          resolve(data);
        }
        );
      }).catch(err => console.log("ERROR ==>", err));
      start += limit;
      response.push(...newActivity);
    } while (newActivity.length == limit);
    
    const activities = []
    response.forEach(activity => {
      const { id, done, type, subject, owner_name, marked_as_done_time } = activity;
      let filteredAct = { id, done, type, subject, owner_name, marked_as_done_time }
      activities.push(filteredAct)
    })
    await InsertActivities(activities);
  }
  
  app.listen(PORT,() => {
    console.log(`App running on port ${PORT}`)
    getActivities();
  })
