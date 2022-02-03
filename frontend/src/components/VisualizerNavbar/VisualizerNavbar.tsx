import React, { useEffect, useState } from 'react';
import { connect } from 'react-redux';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectDot, selectFileName } from '../../store/features/file/fileSlice';
import {
    applyView,
    changeStyle,
    selectNodes,
    applyColor,
    hideNodes,
    foldAllDescendants,
    unhideNodes,
    selectVisualInfo,
    selectProof,
    selectHiddenNodes,
    selectView,
    unselectNodes,
} from '../../store/features/proof/proofSlice';
import { ReduxState, NavbarPropsAndRedux, NavbarProps } from '../../interfaces/interfaces';

import { Alignment, Button, Icon, InputGroup, Navbar, Switch, Menu, MenuItem } from '@blueprintjs/core';
import { Popover2 } from '@blueprintjs/popover2';
import { selectTheme, toggle } from '../../store/features/theme/themeSlice';
import '../../scss/VisualizerNavbar.scss';
import { findNode, reRender } from '../../store/features/externalCmd/externalCmd';

function useWindowSize() {
    // Initialize state with undefined width/height so server and client renders match
    // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
    const [windowSize, setWindowSize] = useState({
        width: 0,
        height: 0,
    });
    useEffect(() => {
        // Handler to call on window resize
        function handleResize() {
            // Set window width/height to state
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }
        // Add event listener
        window.addEventListener('resize', handleResize);
        // Call handler right away so state gets updated with initial window size
        handleResize();
        // Remove event listener on cleanup
        return () => window.removeEventListener('resize', handleResize);
    }, []); // Empty array ensures that effect is only run on mount
    return windowSize;
}

const VisualizerNavbar: React.FC<NavbarPropsAndRedux> = ({
    setDialogIsOpen,
    setDialogContent,
    setDrawerIsOpen,
    visualInfo,
    proof,
    dot,
    view,
    hiddenNodes,
    hideNodes,
}: NavbarPropsAndRedux) => {
    const fileName = useAppSelector(selectFileName);
    const darkTheme = useAppSelector(selectTheme);
    const windowSize = useWindowSize();
    const [command, setCommand] = useState('');
    const [lastCommands, setLastCommands] = useState(['']);
    const [commandId, setCommandId] = useState(0);

    const dispatch = useAppDispatch();

    const openDialog = (content: string): void => {
        setDialogIsOpen(true);
        setDialogContent(content);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
        // Creates an commands historic, registering the past 4 commands
        switch (e.key) {
            case 'Enter':
                // If the command is not a white space
                if (command.trim() !== '') {
                    runCommands(command);
                    if (lastCommands.length === 5) {
                        lastCommands.pop();
                    }
                    lastCommands.unshift('');
                    setLastCommands(lastCommands);
                    setCommand('');
                }
                break;
            case 'ArrowUp':
                if (commandId < lastCommands.length - 1) {
                    const newId = commandId + 1;
                    setCommandId(newId);
                    setCommand(lastCommands[newId]);
                }
                break;
            case 'ArrowDown':
                if (commandId > 0) {
                    const newId = commandId - 1;
                    setCommandId(newId);
                    setCommand(lastCommands[newId]);
                }
                break;
        }
    };

    const runCommands = (command: string): void => {
        const commands = command.trim().split(/ +/);
        let hiddenIds: number[];

        switch (commands[0]) {
            case '/view':
                switch (commands[1]) {
                    case 'basic':
                        dispatch(applyView('basic'));
                        dispatch(reRender());
                        break;
                    case 'propositional':
                        dispatch(applyView('propositional'));
                        dispatch(reRender());
                        break;
                    case 'full':
                        dispatch(applyView('full'));
                        dispatch(reRender());
                        break;
                }
                break;
            case '/select':
                if (commands[1]) {
                    let cmdArg = '';
                    commands.forEach((string, id) => id !== 0 && (cmdArg += string + ' '));
                    // Matches all the brackets
                    const matches = [...cmdArg.matchAll(/\[([^\[\]]+)\]/g)];
                    let idList: number[] = [];

                    // There is a case with brackets
                    if (matches[0]) {
                        const insideBracket = matches[0][1].trim();
                        let insideMatches = [...insideBracket.matchAll(/\s*\d+\s*-\s*\d+\s*/g)];

                        // Number range notation
                        if (insideMatches[0]) {
                            // Get the range limits
                            const rangeLim = insideMatches[0][0].split(/\s*-\s*/).map((numS) => Number(numS));
                            idList = Array.from({ length: rangeLim[1] - rangeLim[0] + 1 }, (_, i) => rangeLim[0] + i);
                        }
                        // List notation
                        else {
                            insideMatches = [...insideBracket.matchAll(/(\s*\d+\s*,*)+/g)];
                            // Number list notation
                            if (insideMatches[0]) {
                                // Group all the matches
                                let listStr = '';
                                insideMatches.forEach((match) => (listStr += match[0]));
                                // Convert to number
                                idList = listStr
                                    .split(/,\s*/)
                                    .filter((word) => word.length > 0 && !isNaN(Number(word)))
                                    .map((id) => Number(id));
                            }
                        }
                    }
                    //
                    else {
                        // /select /let\d+/
                        // Is a regex select?
                        const matches = [...cmdArg.matchAll(/\/[^\/]*\//g)];
                        // If there is a regex
                        if (matches[0]) {
                            const regexString = matches[0][0].substring(1, matches[0][0].length - 1);
                            try {
                                // Search all the nodes with the specific regex matching in the conclusion
                                const regex = new RegExp(regexString);
                                idList = proof.filter((node) => regex.test(node.conclusion)).map((node) => node.id);
                            } catch (err) {
                                // If the inserted regex expression is invalid (probably missing \)
                                console.log(err);
                            }
                        }
                        // There is no regex, so the last possibility is to select based on the RULE
                        else {
                            idList = proof
                                .filter((node) => node.rule.trim() === commands[1].trim())
                                .map((node) => node.id);
                        }
                    }

                    dispatch(selectNodes(idList));
                }
                break;
            case '/unselect':
                const allNodesIds = proof.map((node) => node.id);
                dispatch(unselectNodes(allNodesIds));
                break;
            case '/color':
                if (commands[1]) {
                    // Hex color
                    if (RegExp(/^#([0-9a-f]{3}){1,2}$/i).test(commands[1])) {
                        dispatch(applyColor(commands[1]));
                        break;
                    }
                    // Default colors
                    switch (commands[1]) {
                        case 'red':
                            dispatch(applyColor('#f72b34'));
                            break;
                        case 'orange':
                            dispatch(applyColor('#ff8334'));
                            break;
                        case 'yellow':
                            dispatch(applyColor('#ffc149'));
                            break;
                        case 'green':
                            dispatch(applyColor('#60aa51'));
                            break;
                        case 'blue':
                            dispatch(applyColor('#0097e4'));
                            break;
                        case 'purple':
                            dispatch(applyColor('#a73da5'));
                            break;
                        case 'brown':
                            dispatch(applyColor('#a95a49'));
                            break;
                        case 'gray':
                            dispatch(applyColor('#464646'));
                            break;
                        case 'white':
                            dispatch(applyColor('#f0f0f0'));
                            break;
                    }
                }
                break;
            case '/hide':
                // Hide all the selected nodes
                hiddenIds = Object.keys(visualInfo)
                    .map((id) => Number(id))
                    .filter((id) => visualInfo[id].selected);
                // Make sure there are nodes selected
                if (hiddenIds.length > 1) {
                    // Re-render the canvas and update the store
                    dispatch(reRender());
                    dispatch(hideNodes(hiddenIds));
                }
                break;
            case '/fold':
                // If the option is a number
                if (commands[1] && !isNaN(Number(commands[1]))) {
                    const nodeId = Number(commands[1]);
                    // Is a valid node
                    if (nodeId >= 0 && nodeId < proof.length) {
                        // Re-render the canvas and update the store
                        dispatch(reRender());
                        dispatch(foldAllDescendants(nodeId));
                    }
                }
                break;
            case '/unfold':
                // If there is a number argument
                if (commands[1] && !isNaN(Number(commands[1]))) {
                    const id = Number(commands[1]);
                    // Get the pi node (to be unfold)
                    const obj = proof.find((node) => node.id === id);
                    // If it's a pi node
                    if (obj && obj.hiddenNodes?.length) {
                        // Get the hidden nodes and their ids
                        const hiddenNodes = obj.hiddenNodes ? obj.hiddenNodes : [];
                        hiddenIds = hiddenNodes ? hiddenNodes.map((node) => node.id) : [];
                        // Re-render the canvas and update the store
                        dispatch(reRender());
                        dispatch(unhideNodes({ pi: id, hiddens: hiddenIds }));
                    }
                }
                break;
            case '/find':
                // If there is an argument and is a number
                if (commands[1] && !isNaN(Number(commands[1]))) {
                    // Find the node
                    dispatch(
                        findNode({
                            nodeId: Number(commands[1]),
                            option: commands[2] === '--s' ? true : false,
                        }),
                    );
                }
                break;
        }
    };

    const exportJSON = () => {
        const downloadJSON = {
            dot: dot,
            visualInfo: visualInfo,
            hiddenNodes: hiddenNodes,
            view: view,
        };
        const fName = fileName.split('.');
        fName.splice(fName.length - 1, 1);

        const link = document.createElement('a');
        link.download = fName + '.json';
        link.href = `data:attachment/text,${encodeURIComponent(JSON.stringify(downloadJSON))}`;
        link.click();
    };

    const menus = {
        style: (
            <Menu>
                <MenuItem
                    icon="diagram-tree"
                    text="Graph"
                    onClick={(e: React.MouseEvent<HTMLElement, MouseEvent>) => {
                        e.preventDefault();
                        dispatch(changeStyle('graph'));
                    }}
                />
                <MenuItem
                    icon="folder-open"
                    text="Directory"
                    onClick={(e: React.MouseEvent<HTMLElement, MouseEvent>) => {
                        e.preventDefault();
                        dispatch(changeStyle('directory'));
                    }}
                />
            </Menu>
        ),
        views: (
            <Menu>
                <MenuItem
                    text="Basic"
                    onClick={(e: React.MouseEvent<HTMLElement, MouseEvent>) => {
                        e.preventDefault();
                        dispatch(applyView('basic'));
                        dispatch(reRender());
                    }}
                />
                <MenuItem
                    text="Propositional"
                    onClick={(e: React.MouseEvent<HTMLElement, MouseEvent>) => {
                        e.preventDefault();
                        dispatch(applyView('propositional'));
                        dispatch(reRender());
                    }}
                />
                <MenuItem
                    text="Full"
                    onClick={(e: React.MouseEvent<HTMLElement, MouseEvent>) => {
                        e.preventDefault();
                        dispatch(applyView('full'));
                        dispatch(reRender());
                    }}
                />
            </Menu>
        ),
        download: (
            <Menu>
                <MenuItem icon="layout" text="JSON" onClick={exportJSON} />
                <MenuItem
                    icon="graph"
                    text="DOT"
                    href={`data:attachment/text,${encodeURIComponent(dot ? dot : '')}`}
                    download={fileName ? `${fileName.replaceAll(' ', '_')}.dot` : ''}
                />
                <MenuItem
                    icon="square"
                    text="PNG"
                    onClick={(e: React.MouseEvent<HTMLElement, MouseEvent>) => {
                        e.preventDefault();
                        const link = document.createElement('a');
                        link.download = fileName ? `${fileName.replaceAll(' ', '_')}.png` : '';
                        link.href = (
                            document.getElementsByClassName('konvajs-content')[0].children[0] as HTMLCanvasElement
                        ).toDataURL('image/png');
                        link.click();
                    }}
                />
            </Menu>
        ),
        help: (
            <Menu>
                <MenuItem text="/view">
                    <div className="cmd-desc">
                        <div>
                            <u className="title">Desc.:</u> Command that changes the view mode.
                        </div>
                        <div>
                            <u className="title">Pattern:</u> /view {'<option>'}.
                        </div>
                        <div>
                            <u className="title">Option:</u> basic, propositional, full.
                        </div>
                    </div>
                </MenuItem>
                <MenuItem text="/select">
                    <div className="cmd-desc">
                        <div>
                            <u className="title">Desc.:</u> Command that select a group of nodes.
                        </div>
                        <div>
                            <u className="title">Pattern:</u> /select {'<option>'}.
                        </div>
                        <div>
                            <u className="title">Options:</u>
                            <div className="option">
                                1 - A list of node {`id's`} wrapped by brackets and separated by commas (and spaces if
                                wanted) (eg.: [1, 15, 6,3]).
                            </div>
                            <div className="option">
                                2 - A range of node {`id's`} wrapped by brackets and separated by hyphen (and spaces if
                                wanted) (eg.: [ 4 -15]). This range will include the last element.
                            </div>
                            <div className="option">3 - A node rule (eg.: CHAIN_RESOLUTION).</div>
                            <div className="option">
                                4 - A regex expression used to select all the nodes which the conclusion owns a match
                                (eg.: /\.*false\.*/ {'->'} selects all the nodes with false anywhere in the conclusion).
                            </div>
                        </div>
                    </div>
                </MenuItem>
                <MenuItem text="/unselect">
                    <div className="cmd-desc">
                        <div>
                            <u className="title">Desc.:</u> Command that unselect all the nodes.
                        </div>
                        <div>
                            <u className="title">Pattern:</u> /unselect.
                        </div>
                    </div>
                </MenuItem>
                <MenuItem text="/color">
                    <div className="cmd-desc">
                        <div>
                            <u className="title">Desc.:</u> Command that changes the color of the current selected
                            nodes.
                        </div>
                        <div>
                            <u className="title">Pattern:</u> /color {'<option>'}.
                        </div>
                        <div>
                            <u className="title">Options:</u>
                            <div className="option">1 - A valid hex color notation (eg.: #A7B).</div>
                            <div className="option">
                                2 - A color name between: red, orange, yellow, green, blue, purple, brown, gray, white.
                            </div>
                        </div>
                        <div>
                            <u className="title">Prerequisites:</u> a group of nodes being selected.
                        </div>
                    </div>
                </MenuItem>
                <MenuItem text="/hide">
                    <div className="cmd-desc">
                        <div>
                            <u className="title">Desc.:</u> Command that try to fold (hide) a group of selected nodes.
                        </div>
                        <div>
                            <u className="title">Pattern:</u> /hide.
                        </div>
                        <div>
                            <u className="title">Prerequisites:</u> a group of nodes being selected.
                        </div>
                    </div>
                </MenuItem>
                <MenuItem text="/fold">
                    <div className="cmd-desc">
                        <div>
                            <u className="title">Desc.:</u> Command that fold all descendants of a specific node.
                        </div>
                        <div>
                            <u className="title">Pattern:</u> /fold {'<option>'}.
                        </div>
                        <div>
                            <u className="title">Option:</u> a valid node id.
                        </div>
                    </div>
                </MenuItem>
                <MenuItem text="/unfold">
                    <div className="cmd-desc">
                        <div>
                            <u className="title">Desc.:</u> Command that unfold a specific pi node.
                        </div>
                        <div>
                            <u className="title">Pattern:</u> /unfold {'<option>'}.
                        </div>
                        <div>
                            <u className="title">Option:</u> a valid pi node id.
                        </div>
                    </div>
                </MenuItem>
                <MenuItem text="/find">
                    <div className="cmd-desc">
                        <div>
                            <u className="title">Desc.:</u> Command that find a node and centralize the canvas at it.
                        </div>
                        <div>
                            <u className="title">Pattern:</u> /fild {'<node number>'} {'<option>'}.
                        </div>
                        <div>
                            <u className="title">Option:</u> --s: find and select the node.
                        </div>
                    </div>
                </MenuItem>
            </Menu>
        ),
    };

    return (
        <Navbar>
            <Navbar.Group align={Alignment.LEFT}>
                <Navbar.Heading>
                    <b>{windowSize.width >= 900 ? 'Proof Visualizer' : 'PV'}</b>
                </Navbar.Heading>
                <Navbar.Divider />
                <Button
                    onClick={(e: React.MouseEvent<HTMLElement, MouseEvent>) => {
                        e.preventDefault();
                        openDialog('upload-proof');
                    }}
                    className="bp3-minimal"
                    icon="upload"
                    text={windowSize.width >= 900 ? 'Upload Proof' : ''}
                />
            </Navbar.Group>

            <Navbar.Group align={Alignment.RIGHT}>
                {fileName ? (
                    <>
                        <Navbar.Heading>{fileName}</Navbar.Heading>
                        <Navbar.Divider />
                        <InputGroup
                            id="command"
                            placeholder="/command"
                            value={command}
                            onChange={(e) => {
                                setCommandId(0);
                                lastCommands[0] = e.target.value;
                                setLastCommands(lastCommands);
                                setCommand(e.target.value);
                            }}
                            onKeyDown={handleInputKeyDown}
                            rightElement={
                                <Popover2 content={menus.help} placement="bottom-end">
                                    <Button icon="help" className="bp3-minimal" />
                                </Popover2>
                            }
                        />
                        <Button
                            style={{ marginLeft: '5px' }}
                            icon="play"
                            onClick={() => {
                                runCommands(command);
                                lastCommands.pop();
                                lastCommands.unshift(command);
                                lastCommands[0] = '';
                                setLastCommands(lastCommands);
                                setCommand('');
                            }}
                        />
                        <Navbar.Divider />
                        <Popover2
                            content={fileName ? menus.style : undefined}
                            placement="bottom-end"
                            disabled={fileName ? false : true}
                        >
                            <Button
                                icon="presentation"
                                className="bp3-minimal"
                                text={windowSize.width >= 900 ? 'Style' : ''}
                                disabled={fileName ? false : true}
                            />
                        </Popover2>
                        <Popover2
                            content={fileName ? menus.views : undefined}
                            placement="bottom-end"
                            disabled={fileName ? false : true}
                        >
                            <Button
                                className="bp3-minimal"
                                icon="diagram-tree"
                                text={windowSize.width >= 900 ? 'View' : ''}
                                disabled={fileName ? false : true}
                            />
                        </Popover2>
                        <Button
                            className="bp3-minimal"
                            icon="translate"
                            text={windowSize.width >= 900 ? 'Let Map' : ''}
                            disabled={fileName ? false : true}
                            onClick={() => setDrawerIsOpen(true)}
                        />
                        <Popover2
                            content={fileName ? menus.download : undefined}
                            placement="bottom-end"
                            disabled={fileName ? false : true}
                        >
                            <Button
                                className="bp3-minimal"
                                icon="download"
                                text={windowSize.width >= 900 ? 'Download' : ''}
                                disabled={fileName ? false : true}
                            />
                        </Popover2>
                        <Navbar.Divider />
                    </>
                ) : null}

                <span id="switch-button-dark-theme">
                    <Switch checked={useAppSelector(selectTheme)} onChange={() => dispatch(toggle())} />
                    <Icon icon={darkTheme ? 'moon' : 'flash'}></Icon>
                </span>
            </Navbar.Group>
        </Navbar>
    );
};

function mapStateToProps(state: ReduxState, ownProps: NavbarProps) {
    return {
        ...ownProps,
        proof: selectProof(state),
        dot: selectDot(state),
        view: selectView(state),
        visualInfo: selectVisualInfo(state),
        hiddenNodes: selectHiddenNodes(state),
    };
}

const mapDispatchToProps = { hideNodes };

export default connect(mapStateToProps, mapDispatchToProps)(VisualizerNavbar);
