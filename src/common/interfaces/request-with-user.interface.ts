export interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    roles: string[]; // Assuming roles are represented as an array of strings
  };
}
