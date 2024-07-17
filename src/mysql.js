import {pool} from "../database/connectionMySQL.js";
const getusers = async () => {
    try{
        const [result] = await pool.query("SELECT id, nombre_completo, login, password, saldo, tipo_usuario, estado FROM usuarios;");
        console.table(result);
        console.log("Lista de usuarios")
    }catch(error){
        console.log(error);
    }
};
getusers();