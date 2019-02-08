# exoframe-recipe-nodered
Simple node-red deployment with user admin user

## Requirements
  * Exoframe server

## Containers
  * Node-RED (henrikcoll/nodered:latest)

## Questions
  * `Instance name: (input)` Project name
  * `Instance url: (input)` url (example: node-red.example.com)
  * `Admin username: (input)` Username for the user
  * `Admin password: (password)` Password for the user, gets hashed using bcrypt
  * `Do you want to enable the projects feature? (confirm)` Enable node-red's project feature [link](https://nodered.org/docs/user-guide/projects/)
  * `Do you want to enable context file storage? (confirm)` Enable context file storage [link](https://nodered.org/docs/user-guide/context#context-stores)
