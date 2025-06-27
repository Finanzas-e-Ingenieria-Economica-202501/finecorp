export interface JWTPayload {
  username: string;
  id: string;
  iat?: number;
  exp?: number;
}
