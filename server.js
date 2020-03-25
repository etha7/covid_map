const express = require('express');
const bodyParser = require('body-parser')
const path = require('path');
const request = require("request")
const app = express();
const config = require("./src/config")
const fetch = require("node-fetch");
const {introspectSchema, makeRemoteExecutableSchema, makeExecutableSchema, mergeSchemas} = require('graphql-tools') 
const {ApolloServer, gql} = require('apollo-server-express')
const {transformSchemaFederation} = require('graphql-transform-federation')

const { resolvers } = require('./src/serverResolvers.js')
const { typeDefs } = require('./src/serverTypeDefs.js')
/*
sudo service postgresql start
sudo service postgresql stop
sudo -u postgres -i
export DATABASE_URL=postgres://root:password@localhost:5432/picker
psql
ALTER USER root WITH SUPERUSER; 
exit 
exit
psql
CREATE DATABASE picker;
*/

//Connect to postgres server
const { Pool } = require('pg')
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
})



//GraphQL delegates requests from client to remote Yelp endpoint
const { HttpLink }  = require("apollo-link-http")
const link = new HttpLink({
  uri: "https://api.yelp.com/v3/graphql",
  headers: {
    'Authorization': config.auth  
  },
  fetch: fetch
})
setup_yelp_graphQL = async () => {
  var schema = await introspectSchema(link)
  const remoteSchema = makeRemoteExecutableSchema({
    schema,
    link,
  });
  const serverSchema = makeExecutableSchema({
    resolvers, typeDefs
  })
  var schemas = [remoteSchema, serverSchema]
  schema = mergeSchemas({schemas})
  var config = {
    Query: {
      // Ensure the root queries of this schema show up the combined schema
      extend: true,
    }
  }
  federatedSchema = transformSchemaFederation(schema, config)

 const server = new ApolloServer({schema: federatedSchema, 
                                  context: (req, res)=>{
                                    return { pool };
                                  }
                                 })
 server.applyMiddleware({app})
}
setup_yelp_graphQL()


app.use(express.static(path.join(__dirname, 'build')))
app.listen(process.env.PORT || 8080);