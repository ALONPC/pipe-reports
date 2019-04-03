require('dotenv').config()
const express = require("express");
const app = express();
const moment = require('moment');
const mysql = require('mysql');
const Pipedrive = require("pipedrive");

const TOKEN = process.env.PIPEDRIVE_TOKEN;
const PORT = process.env.PORT || 5000;
const rocket = "\u{1F680}";

const today = moment().locale('en').format('L')
const oneMonthAgo = moment().locale('en').subtract(1, 'months').startOf('month').format('L')

const pipedrive = new Pipedrive.Client(TOKEN, {
  strictMode: true
});

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

// const activities = [
//   { id: 1, done: true, type: 'call', subject: 'Llamada en cold', owner_name: 'Lorem', marked_as_done_time: '' },
//   { id: 2, done: false, type: 'call', subject: 'Llamada en hot', owner_name: 'Ipsum', marked_as_done_time: '' }
// ]

function InsertActivities(activities){
  const con = ConnectToMySql();

  const drop = `DROP TABLE IF EXISTS Activities`;

  const createTable = `
  CREATE TABLE IF NOT EXISTS Activities (
    id int(11) NOT NULL,
    done tinyint(1) NOT NULL,
    type varchar(50) NOT NULL,
    subject varchar(250) NOT NULL,
    owner_name varchar(250) NOT NULL,
    marked_as_done_time date DEFAULT NULL,
    PRIMARY KEY (id)
  ) ENGINE=InnoDB DEFAULT CHARSET=latin1;
  `

  con.query(drop, (error, results, fields) => {
    if(error){
      console.log('ERROR ON DROPING TABLE', error.message)
      throw error
    }
  })

  con.query(createTable, (error, results, fields) => {
    if(error){
      console.log('ERROR ON CREATING TABLE', error.message)
      throw error
    }
  })

  try{
    console.log("Inserting rows in MySQL database...")
    activities.forEach((activity) => {
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
    console.log(`App running on port ${PORT} ${rocket} ${rocket} ${rocket}`)
    console.log(`Starting to fetch from ${oneMonthAgo} up to ${today} (today)`)
    getActivities();
  })
