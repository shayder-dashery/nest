
import { Column, Model, Table } from 'sequelize-typescript';

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
}
