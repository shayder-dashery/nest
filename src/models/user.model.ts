import { Column, DataType, Model, Table } from 'sequelize-typescript';
import { UserRole } from '../users/userType';

@Table
export class User extends Model {
  @Column
  primeiroNome: string;

  @Column
  sobrenome: string;

  @Column({ unique: true })
  email: string;

  @Column
  senha: string;

  @Column({ defaultValue: true, allowNull: false })
  ativo: boolean;

  @Column({
    type: DataType.ENUM(...Object.values(UserRole)),
    defaultValue: UserRole.CUSTOMER,
  })
  role: UserRole;
}