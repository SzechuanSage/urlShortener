# urlShortener
Free Code Camp URL Shortener Microservice

## Requirements
express module  
`npm install express`

## Usage
Run the server. It will start listening to a specified port, or to port 3000 by
default.  
`node server.js`  

If there is a mongo database running locally, a mongodb URL can be passed to the
server to access that database.  
`node server.js mongodb://localhost:27017/urlShortener`  


In a browser navigate to [http://localhost:3000/](http://localhost:3000/)  
(replace 3000 with appropriate port).  
