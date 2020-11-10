import { User, Client, Phone } from "../../models/";
import generateToken from "../../functions/generateToken";
import * as auth from "../../functions/auth";
import * as utils from "../../utils";
import * as dbUtils from "../../db-utils";

export default {
    async addClient(obj, { input }, { user }) {
        try {
            if (!user) throw new Error("No autorizado");
            const userId = user._id;
            const validUser = await dbUtils.exists(["User"], {
                _id: userId,
            });
            if (!validUser) throw new Error("Este usuario no existe");

            const newInputs = utils.onlyValidateLengthAndTrimInputs(input);
            const validInputs = utils.validateObject(newInputs);

            if (validInputs) {
                const validPhoneType = await dbUtils.exists(["PhoneType"], {
                    _id: newInputs.phone.phoneType,
                });

                if (!validPhoneType)
                    throw new Error("Este tipo de telefono no es valido");

                let clientExist = await Client.findOne({
                    user: userId,
                    name: newInputs.name,
                });

                if (clientExist)
                    throw new Error("Ya cuenta con un cliente con ese nombre");

                newInputs.measures["creadoEl"] = utils.getDateNow();
                newInputs.phone["isMain"] = true;

                let client = new Client({
                    name: newInputs.name,
                    measures: newInputs.measures,
                    user: userId,
                });

                let phone = new Phone({
                    ...newInputs.phone,
                    client: client._id,
                });

                await client.save();
                await phone.save();

                return { msg: "Cliente agregado correctamente" };
            }

            throw new Error("Verifica los campos que mandas");
            // const cliente = await Client.findOne({
            //     name,
            //     user,
            // });

            // if (cliente) {
            //     return {
            //         message: "Ya hay un cliente con ese nombre",
            //         success: false,
            //         loading: false,
            //     };
            // }

            // const theUser = await User.findById(user);
            // const client = new Client({ ...input });
            // const phone = new Phone({
            //     ...phoneNumber,
            //     client: client._id,
            //     isMain: true,
            // });

            // await phone.save();
            // client.phones.push(phone);
            // await client.save();
            // theUser.clients.push(client);
            // await theUser.save();

            // return {
            //     message: "Cliente agregado con exito",
            //     loading: false,
            //     success: true,
            // };
        } catch (err) {
            throw new Error(err);
        }
    },
    async updateClient(parent, { clientData }, { user }) {
        try {
            if (!user) throw new Error("No autorizado");
            let newInputs = utils.onlyValidateLengthAndTrimInputs(clientData);
            let validInputs = utils.validateObject(newInputs);
            if (!validInputs) throw new Error("Verifica los campos");

            let client = await Client.findOneAndUpdate(
                {
                    user: user._id,
                    _id: newInputs.clientId,
                },
                { name: newInputs.name },
                { new: true }
            );

            if (!client)
                throw new Error("Este cliente no puede ser actualizado");

            return {
                msg: "Cliente actualizado con exito",
            };
        } catch (err) {
            throw new Error(err);
        }
    },
    async dropClient(parent, { clientId }, { user }) {
        try {
            if (!user) throw new Error("No autorizado");
            let aprovedClientId = utils.onlyValidateLength(clientId);
            if (!aprovedClientId) throw new Error("Este campo es requerido");

            let validClient = await dbUtils.exists("Client", {
                _id: clientId,
                user: user._id,
            });
            if (!validClient)
                throw new Error("Este cliente no existe o no le pertenece");

            await Client.findByIdAndDelete(clientId);
            await Phone.deleteMany({ client: clientId });

            return {
                msg: "Cliente eliminado correctamente",
            };
        } catch (err) {
            throw new Error(err);
        }
    },
    async addMeasure(parent, args, { user }) {
        try {
            if (!user) throw new Error("No autorizado");
            let userId = user._id;

            let newInputs = utils.onlyValidateLengthAndTrimInputs(args);
            let validInputs = utils.validateObject(newInputs);

            if (!validInputs) throw new Error("Los campos no son validos");

            // Ver si el cliente le pertenece a ese usuario
            let clientExist = await dbUtils.exists("Client", {
                _id: newInputs.clientId,
                user: userId,
            });

            if (!clientExist)
                throw new Error("Este cliente no le pertenece a ese usuario");

            let client = await Client.findById(newInputs.clientId, {
                _id: 1,
                measures: 1,
            });

            newInputs.measures["creadoEl"] = utils.getDateNow();

            client.measures.push(newInputs.measures);

            // ordenacion por fecha
            client.measures.sort((a, b) =>
                a.creadoEl == b.creadoEl ? 0 : a.creadoEl > b.creadoEl ? -1 : 1
            );

            await client.save();

            return { msg: "Medida agregada correctamente" };
        } catch (err) {
            throw new Error(err);
        }
    },
    async updateMeasure(parent, { measureData }, { user }) {
        try {
            if (!user) throw new Error("No autorizado");
            let newInputs = utils.onlyValidateLengthAndTrimInputs(measureData);
            let validInput = utils.validateObject(newInputs);
            if (!validInput) throw new Error("Verifica tus campos");

            let client = await Client.findOne(
                {
                    _id: newInputs.clientId,
                    user: user._id,
                },
                {
                    measures: 1,
                }
            );

            if (!client)
                throw new Error("Este cliente no existe o no le pertenece");

            let isMeasure = (m) => m._id == newInputs.measureId;
            let measureIndex = client.measures.findIndex(isMeasure);

            let { _id, creadoEl } = client.measures[measureIndex];
            newInputs.measures["_id"] = _id;
            newInputs.measures["creadoEl"] = creadoEl;

            client.measures[measureIndex] = newInputs.measures;

            await client.save();

            return { msg: "Medida actualizada correctamente" };
        } catch (err) {
            throw new Error(err);
        }
    },
    async dropMeasure(parent, args, { user }) {
        try {
            if (!user) throw new Error("No autorizado");
            let newInputs = utils.onlyValidateLengthAndTrimInputs(args);
            let validInput = utils.validateObject(newInputs);
            if (!validInput) throw new Error("Verifica tus campos");

            let client = await Client.findOne({
                _id: newInputs.clientId,
                user: user._id,
            });
            if (!client)
                throw new Error("Este usuario no existe o no te pertenece");

            let compareMeasures = (m) => String(m._id) !== newInputs.measureId;
            client.measures = client.measures.filter(compareMeasures);

            await client.save();

            return { msg: "La medida fue eliminada correctamente" };
        } catch (err) {
            throw new Error(err);
        }
    },
    async addPhone(obj, { phoneData }, { user }) {
        try {
            if (!user) throw new Error("No authotizado");
            let newInputs = utils.onlyValidateLengthAndTrimInputs(phoneData);
            let validInputs = utils.validateObject(newInputs);

            if (!validInputs) throw new Error("Verifica tus campos");

            const client = await dbUtils.exists("Client", {
                _id: newInputs.client,
                user: user._id,
            });
            if (!client)
                throw new Error("El cliente no existe o no te pertenece");

            const validPhoneType = dbUtils.exists("PhoneType", {
                _id: newInputs.phoneType,
            });
            if (!validPhoneType)
                throw new Error("Este no es un tipo de telefono valido");

            const phoneExists = await dbUtils.exists("Phone", {
                phone: newInputs.phone,
                client: newInputs.client,
            });
            if (phoneExists) throw new Error("Este numero ya esta registrado");

            await Phone.findOneAndUpdate(
                { isMain: true, client: newInputs.client },
                { isMain: false },
                { new: true }
            );

            const newPhone = new Phone({
                isMain: true,
                ...newInputs,
            });

            await newPhone.save();

            return newPhone;
        } catch (err) {
            throw new Error(err);
        }
    },
    async updatePhone(parent, { phoneData, phoneId }, { user }) {
        try {
            if (!user) throw new Error("No autorizado");
            let newInputs = utils.onlyValidateLengthAndTrimInputs(phoneData);
            let validInputs = utils.validateObject(newInputs);

            if (!validInputs) throw new Error("Verifica tus campos");

            const validPhoneType = await dbUtils.exists("PhoneType", {
                _id: newInputs.phoneType,
            });
            if (!validPhoneType)
                throw new Error("Este no es un tipo de telefono valido");

            const phoneExists = await dbUtils.exists("Phone", {
                _id: phoneId,
                client: newInputs.client,
            });
            if (!phoneExists)
                throw new Error("Este cliente no cuenta con este telefono");

            delete newInputs["client"];
            await Phone.findByIdAndUpdate(phoneId, newInputs);

            return {
                msg: "Telefono actualizado con exito",
            };
        } catch (err) {
            throw new Error(err);
        }
    },
    async dropPhone(parent, phoneData, { user }) {
        try {
            if (!user) throw new Error("No autorizado");
            let newInputs = utils.onlyValidateLengthAndTrimInputs(phoneData);
            let validInputs = utils.validateObject(newInputs);

            if (!validInputs) throw new Error("Verifica tus campos");

            const phoneExists = await dbUtils.exists("Phone", {
                _id: newInputs.phoneId,
                client: newInputs.clientId,
            });
            if (!phoneExists)
                throw new Error("Este cliente no cuenta con este telefono");

            await Phone.findByIdAndDelete(newInputs.phoneId);

            return {
                msg: "Telefono eliminado con exito",
            };
        } catch (err) {
            throw new Error(err);
        }
    },
    async addPhoneType(parent, { type }, context) {
        try {
            let validType = utils.validateAndTrimLowerInput(type);
            if (!validType)
                throw new Error("Ingrese un tipo de telefono valido");

            return await dbUtils.newElement("PhoneType", { type });
        } catch (err) {
            throw new Error(err);
        }
    },
    async login(parent, args) {
        try {
            let email = utils.validateAndTrimLowerInput(args.email);

            if (!email) throw new Error("Inputs no validos");

            let userData = await User.findOne(
                { email },
                { _id: 1, email: 1, password: 1 }
            );

            if (!userData) throw new Error("Correo y/o Contraseña incorrecta");

            const passwordMatch = await auth.comparePassword(
                args.password,
                userData.password
            );

            if (!passwordMatch)
                throw new Error("Correo y/o Contraseña incorrecta");

            userData = userData.toJSON();
            delete userData.password;

            return {
                token: generateToken(userData),
            };
        } catch (err) {
            throw new Error(err);
        }
    },
    async register(parent, { input }) {
        try {
            let email = utils.validateAndTrimLowerInput(input.email);
            let password = utils.onlyValidateLength(input.password, 8);

            if (!email || !password) throw new Error("Inputs no validos");

            const userExists = await User.findOne({ email }, { _id: 1 });

            if (!userExists) {
                let passwordHash = await auth.hashPassword(password);

                await User.create({
                    email,
                    password: passwordHash,
                });

                return {
                    msg: "Cuenta creada con exito",
                };
            }

            throw new Error("Ya exsiste una cuenta con estos datos");
        } catch (err) {
            throw new Error(err);
        }
    },
};
