import React from "react"
import {getMeApi} from "../components/user.js"


export function useUser(){
    const getMe = async (token) =>{
        try{
            const response = await getMeApi(token);
            return response;

            }catch (error){
                throw error;
                }

        };

        return {

            getMe,

            };
    }