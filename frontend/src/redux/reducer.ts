import { combineReducers } from 'redux';

import { proof, stateInterface } from '../components/interfaces';

const initialStateProofReducer = {
    proof: {
        label: '',
        options: '',
        problem: '',
        dot: '',
    },
};

const initialStateDarkThemeReducer = {
    darkTheme: true,
};

type Action =
    | { type: 'SET_PROOF'; payload: proof }
    | { type: 'TOGGLE_DARK_THEME' }
    | { type: 'SET_DOT'; payload: proof['dot'] };

const proofReducer = (
    state: stateInterface['proofReducer'] = initialStateProofReducer,
    action: Action,
): stateInterface['proofReducer'] => {
    switch (action.type) {
        case 'SET_PROOF':
            return {
                ...state,
                proof: {
                    label: action.payload.label,
                    options: action.payload.options,
                    problem: action.payload.problem,
                    dot: action.payload.dot,
                },
            };
        case 'SET_DOT':
            return {
                ...state,
                proof: {
                    ...state.proof,
                    dot: action.payload,
                },
            };
        default:
            return state;
    }
};

const darkThemeReducer = (
    state: stateInterface['darkThemeReducer'] = initialStateDarkThemeReducer,
    action: Action,
): stateInterface['darkThemeReducer'] => {
    switch (action.type) {
        case 'TOGGLE_DARK_THEME':
            return {
                ...state,
                darkTheme: !state.darkTheme,
            };
        default:
            return state;
    }
};

export default combineReducers({ proofReducer, darkThemeReducer });
