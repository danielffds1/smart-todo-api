import { UserEntity } from "src/modules/users/entities/user.entity";
export class AuthResponseDto {
    access_token: string;

    token_type: string;

    expires_in: number;

    user: UserEntity;
   
    constructor(access_token: string, expires_in: number, user: UserEntity) {
        this.access_token = access_token;
        this.token_type = 'Bearer';
        this.expires_in = expires_in;
        this.user = user;
    }
}
