# Chat app
This is a simple chat app using React for the frontend and Node.js for the backend. The app uses websockets to allow for real-time communication between users.

## Installation
1. Clone the repository
2. Run `npm install` in the /backend directory
3. Run `npm install` in the /frontend directory
4. Fill the .ENV file in the /backend directory with your MongoDB connection string and a secret key for JWT
5. Run `node .` in the /backend directory
6. Run `npm start` in the /frontend directory

## Usage
The app will be running on http://localhost:3000. You can open multiple tabs to simulate multiple users and see the real-time communication.

## Important
When deleting users collection, ensure the /backend/profile-pictures directory is empty. This is because the app saves the profile pictures in this directory and the database only stores the file name. 

Same applies to the messages collection, ensure the /backend/attachments directory is empty. (This is to be added in the future.)

## Notes
The app is still in development and is not yet ready for production and may never be. It is a learning project and is not intended to be used in a production environment for now.

## License
[MIT](https://choosealicense.com/licenses/mit/)

