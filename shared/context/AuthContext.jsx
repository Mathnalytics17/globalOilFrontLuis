import React, {useState,useEffect, createContext, useContext} from "react";
import {setToken} from "../components/token.js"
import {useUser} from "../hooks/useUser.jsx"
import {getToken} from"../components/token.js"
import {removeToken} from"../components/token.js"

export const AuthContext = createContext({
    auth: undefined,
    login: () => null,
    logout: () => null,
});

export function AuthProvider(props) {
    const {children} = props;

    const {getMe}= useUser();
    const [auth,setAuth] =useState(undefined)

    useEffect(()=>{
        (async ()=>{

            const token= getToken();
            console.log(token);

            if (token){
                const me =await getMe(token)
                console.log(me)
                setAuth({token,me})
                }else{

                    setAuth(null)}
            })()



        },[])

    const login = async (token) => {
        setToken(token)
        console.log("context login -->", token);
        const me= await getMe(token)
        console.log(me)
        setAuth({token,me})
        };

    const logout = ( ) =>{
        if(auth){
            removeToken();
            setAuth(null)

            }
        }

    const valueContext = {
        auth,
        login,
        logout,
    };

    if (auth===undefined) return null;

    return (
        <AuthContext.Provider value={valueContext}>
            {children}
        </AuthContext.Provider>
    );
}

// Hook para usar el contexto de autenticación
export function useAuth() {
    return useContext(AuthContext);
}
