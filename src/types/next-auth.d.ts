import "next-auth";
import "next-auth/jwt";

/**
 * 扩展 next-auth Session/JWT/User 类型
 * 加 lekao_gift_coin / tCoin / role 字段
 */
declare module "next-auth" {
  interface User {
    id: string;
    email: string;
    name: string | null;
    role: string;
    lekao_gift_coin: number;
    t_coin: number;
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      role: string;
      lekao_gift_coin: number;
      t_coin: number;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: string;
    lekao_gift_coin: number;
    t_coin: number;
  }
}