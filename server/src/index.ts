import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import  userRouter  from './routes/userRouter';
import  playerRouter  from './routes/playerRouter';
import cors from 'cors';

import { connectToDatabase } from './db';
const app = express();
const port = 3000;
app.use(cors());

app.use(express.json());

connectToDatabase();
app.get('/', (req: Request, res: Response) => {
    res.send('Welcome to Aptos Arena!');
});

app.use('/api/user',userRouter);
app.use('/api/player',playerRouter);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
