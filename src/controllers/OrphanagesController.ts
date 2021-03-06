import {Request, Response} from 'express'
import {getRepository} from 'typeorm';
import { ReadStream } from 'typeorm/platform/PlatformTools';
import Orphanage from '../models/Orphanage';
import orphanageView from '../views/orphanages_view'
import * as Yup from 'yup'
import path from 'path';
import fs from 'fs';

export default {
    async index(request: Request, response:Response){
        const orphanagesRepository = getRepository(Orphanage);
        const orphanages = await orphanagesRepository.find({
            relations: ['images']
        });
        return response.json(orphanageView.renderMany(orphanages));
    },
    async show(request: Request, response:Response){
        const {id} = request.params;
        const orphanagesRepository = getRepository(Orphanage);
        const orphanage = await orphanagesRepository.findOneOrFail(id, {
            relations: ['images']
        });
        return response.json(orphanageView.render(orphanage));
    },
    async create(request:Request, response:Response){
        //console.log(request.body);
        const {
            name,
            latitude,
            longitude,
            about,
            instructions,
            opening_hours,
            open_on_weekends
        } = request.body;
        
        const orphanagesRepository = getRepository(Orphanage);

        const requestImages = request.files as Express.Multer.File[];
        const images = requestImages.map(image => {
            return { path: image.filename}
        })
        //console.log(images);
        const data = {
            name,
            latitude,
            longitude,
            about,
            instructions,
            opening_hours,
            open_on_weekends: open_on_weekends === 'true',
            images
        }
        const schema = Yup.object().shape({
            name: Yup.string().required('Name needed'),
            latitude: Yup.number().required(),
            longitude: Yup.number().required(),
            about: Yup.string().required().max(300),
            instructions: Yup.string().required(),
            opening_hours: Yup.string().required(),
            open_on_weekends: Yup.boolean().required(),
            images: Yup.array(
                Yup.object().shape({
                    path: Yup.string().required()
                })
            )
        });
        try{
            await schema.validate(data, {
                abortEarly:false,
                
            });
        }catch(err) {
            images.forEach(async ({ path: file}) => {
                const filePath = path.join(__dirname, '..', '..', 'uploads', file)
                await fs.promises.unlink(filePath)
            })
            throw err
        }
        const orphanage = orphanagesRepository.create(data);
        console.log(data);
        await orphanagesRepository.save(orphanage);
        return response.status(201).json(orphanage);
    }
}