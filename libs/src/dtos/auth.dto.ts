export interface GuestLoginDto {
  nickname: string;
}

export interface RegisterDto {
  nickname: string;
  email: string;
  password: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthResponseDto {
  accessToken: string;
  player: {
    id: string;
    nickname: string;
    isGuest: boolean;
    email?: string;
  };
}
