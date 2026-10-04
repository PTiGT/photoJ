import bcrypt from 'bcryptjs';

const ROUNDS = process.env.NODE_ENV === 'test' ? 4 : 10;

export const hashPassword = (password) => bcrypt.hash(password, ROUNDS);
export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);
