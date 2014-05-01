/*
 * Controls the Run and Walk features of the Watson Graphcis Lab
 * Author: James Miltenberger
 * Co-Authors: Mitchell Martin, Jonathan Teel
 */

function Run_walk(figNum) {
    //Local variables
    var step = 0;
    var programRunning = false;
    var runMode = false;
    var fresh = true;
    var loopArray = new Array();
    var editor;
    var code;
    var canvas;
    var interpreter;
    var variables;
    
    //public functions
    this.walk = walk;
    this.run = run;
    this.getObjects = getObjects;
    this.getFresh = getFresh;
    this.setFresh = setFresh;

    //Allows users to run the program slowly
    function run() {
        runMode = true;
        walk();
        var delay = setInterval(function () {
            if (!programRunning) {
                runMode = false;
                clearInterval(delay);
            } else {
                runMode = true;
                walk();
            }
        }, 100);
        //Reset
        $("#walkButton" + figNum).html("Reset").off("click").click(function () {
            fresh = true;
            clearInterval(delay);
            step = 0;
            editor.setSelectedRow(editor.getRowCount() - 1);
            editor.clearHighlighting();
            $("#runButton" + figNum).html("Run").off("click").click(function () {
                run();
            });
            $(this).html("Walk").off("click").click(function () {
                walk();
            });
            changeBtnState(false);
            canvas.clear();
            canvas.draw();
        });
        //Pause
        $("#runButton" + figNum).html("Pause").off("click").click(function () {
            clearInterval(delay);
            $(this).html("Play").off("click").click(function () {
                run();
            });
            $("#walkButton" + figNum).html("Walk").off("click").click(function () {
                walk();
            });
        });
    }

    //Allows users to walk through the program code one step at a time
    function walk() {
        if (editor.getRowCount() == 1) return;
        changeBtnState(true);
        var oldPos = -1;
        if (!programRunning) {
            //check if selected row is before end of code
            if (editor.getSelectedRowIndex() < editor.getRowCount() - 1) {
                console.log("here");
                editor.selectRowByIndex(editor.getRowCount()-1);
            }
        }
        programRunning = true;

        //Make sure to skip code that isn't supposed to get parsed
        if (editor.getRowCount() > 1 && step == 0) {
            if (code.rowToString(step).indexOf("//") >= 0) {
                do { step++; } while (code.rowToString(step-1).indexOf("//Program") == -1)
            }
        }

        //Set some buttons to false while walking or running
        $(".button" + figNum).attr("disabled", true);
        
        //Don't allow step to go beyond program scope
        if (step == editor.getRowCount()-1) {
            editor.setSelectedRow(editor.getRowCount()-1);
            editor.clearHighlighting();
            
            step = 0;
            $("#runButton" + figNum).html("Run").off("click").click(function () {
                run();
            });
            $("#walkButton" + figNum).html("Walk").off("click").click(function () {
                walk();
            });
            $(".button" + figNum).attr("disabled", false);
            $("#vvDivHolder" + figNum).slideUp("medium");
            changeBtnState(false);
            programRunning = false;
            fresh = true;
            return;
        }
        
        editor.selectAndHighlightRowByIndex(step); //selects line and highlights it
        canvas.clear();
        canvas.draw();

        //Polygon found , checks to make sure not erase() command
        if (code.rowToString(step).indexOf("g") >= 0 && code.rowToString(step).indexOf("draw") == -1 && code.rowToString(step).indexOf("color") == -1 && code.rowToString(step).indexOf("erase") == -1) {
            var string = code.rowToString(step).trim();
            step++;
            while (!containsCommand(code.rowToString(step + 1))) {
                string += code.rowToString(step);
                step++;
            }
            step++;
            interpreter.interpret(string);
        }
        //Loop found
        else if (code.rowToString(step).indexOf("repeat") >= 0 && code.rowToString(step).indexOf("COUNTER") == -1) {
            var i = Number(code.rowToString(step).substring(code.rowToString(step).indexOf("repeat") + 6, code.rowToString(step).indexOf("times")));
            step += 2;
            var loopStart = step;
            loopArray[loopArray.length] = new makeLoop(loopStart, i);

        }
        //found the end of a loop
        else if (code.rowToString(step).indexOf("endloop") >= 0) {
            //Loop is not finished. Decrement i and return to loop start.
            if (loopArray[loopArray.length - 1].i > 1) {
                loopArray[loopArray.length - 1].i--;
                step = loopArray[loopArray.length - 1].loopStart;
            }
            //this loop is finished. Remove it from array and increment step
            else {
                step++;
                loopArray.splice(loopArray.length - 1, 1);
            }
        } else {
            interpreter.interpret(code.rowToString(step));
            step++;
        }
        canvas.draw();
        updateVarValueWindow(); //Update data in variable tracker window
        runMode = false;
    }

    function containsCommand(input) {
        var found = false;
        found = found || input.indexOf("draw") != -1;
        found = found || input.indexOf("erase") != -1;
        found = found || input.indexOf("=") != -1;
        found = found || input.indexOf("color") != -1;
        found = found || input.indexOf("loop") != -1;
        found = found || input.indexOf("repeat") != -1;
        found = found || input.indexOf("endloop") != -1;
        return found;
    }

    //returns the indent of the loop.
    function makeLoop(loopStart, i) {
        this.loopStart = loopStart;
        this.i = i;
    }

    //Updates the variables in the variables tracker.
    function updateVarValueWindow() {
        var cSpace = "&nbsp&nbsp&nbsp&nbsp&nbsp";
        var vvDiv = document.getElementById("varValDiv" + figNum);
        var html = '<table id="varValueTable" style="border-spacing:15px 1px"><tbody><td>variable' + cSpace + '</td><td>type' + cSpace + '</td><td>value' + cSpace + '</td></tr>';
        var i, canShow = 0;

        for (i = 0; i < interpreter.getD().length; i++) {
            html += '<tr><td>d' + (i + 1) + '</td><td>distance</td><td>' + interpreter.getD()[i] + '</td></tr>';
            canShow++;
        }
        for (i = 0; i < interpreter.getP().length; i++) {
            if (interpreter.getP()[i].type != undefined && interpreter.getP()[i].startX != -1) {
                html += '<tr><td>p' + (i + 1) + '</td><td>' + interpreter.getP()[i].type + '</td><td>( ' + interpreter.getP()[i].startX + ', ' + Math.abs(interpreter.getP()[i].startY - 300) + ' )</td></tr>';
                canShow++;
            }
        }
        for (i = 0; i < interpreter.getL().length; i++) {
            if (interpreter.getL()[i].type != undefined) {
                html += '<tr><td>l' + (i + 1) + '</td><td>' + interpreter.getL()[i].type + '</td><td>' + '( ( ' + interpreter.getL()[i].startX + ', ' + Math.abs(interpreter.getL()[i].startY - 300) + ' ) ( ' + interpreter.getL()[i].endX + ', ' + Math.abs(interpreter.getL()[i].endY - 300) + ' ) )' + '</td></tr>';
                canShow++;
            }
        }
        for (i = 0; i < interpreter.getG().length; i++) {
            if (interpreter.getG()[i].type != undefined) {
                html += '<tr><td>g' + (i + 1) + '</td><td>' + interpreter.getG()[i].type + '</td>';
                html += '<td>';
                for (var j = 0; j < interpreter.getG()[i].angles.length; j++) {
                    html += ((j == 0) ? '( ( ' : '( ') + interpreter.getG()[i].angles[j].startX + ', ' + Math.abs(interpreter.getG()[i].angles[j].startY - 300) + ' ) ';
                    if (j != interpreter.getG()[i].angles.length - 1)
                        html += ', ';
                    else
                        html += ' ( ' + interpreter.getG()[i].angles[0].startX + '. ' + Math.abs(interpreter.getG()[i].angles[0].startY - 300) + ' ) ) ';
                }
                html += '</td></tr>';
                canShow++;
            }
        }
        for (i = 0; i < interpreter.getC().length; i++) {
            if (interpreter.getC()[i].type != undefined && interpreter.getC()[i].startX != 0 && interpreter.getC()[i].startY != 0) {
                canShow++;
                html += '<tr><td>c' + (i + 1) + '</td><td>' + interpreter.getC()[i].type + '</td><td>' + '( ( ' + interpreter.getC()[i].startX + ', ' + Math.abs(interpreter.getC()[i].startY - 300) + ' ) ' + interpreter.getC()[i].diameter + ' )</td></tr>';
            }
        }
        if (canShow > 0 && !runMode) {
            vvDiv.innerHTML = html;
            $("#vvDivHolder" + figNum).slideDown("medium");
        } else {
            $("#vvDivHolder" + figNum).slideUp("medium");
        }
    }

    // disable / enable buttons for run walk
    function changeBtnState(state) {
        document.getElementById("distanceButton" + figNum).disabled = state;
        document.getElementById("pointButton" + figNum).disabled = state;
        document.getElementById("lineButton" + figNum).disabled = state;
        document.getElementById("polygonButton" + figNum).disabled = state;
        document.getElementById("circleButton" + figNum).disabled = state;
        document.getElementById("assignButton" + figNum).disabled = state;
        document.getElementById("drawButton" + figNum).disabled = state;
        document.getElementById("eraseButton" + figNum).disabled = state;
        document.getElementById("colorButton" + figNum).disabled = state;
        document.getElementById("loopButton" + figNum).disabled = state;
    }
    
    //fresh getter
    function getFresh() {
        return fresh;
    }
    
    //fresh setter
    function setFresh(value) {
        fresh = value;
    }
    
    //gets objects
    function getObjects(editorObj, codeObj, canvasObj, interpreterObj, variablesObj) {
        editor = editorObj;
        code = codeObj;
        canvas = canvasObj;
        interpreter = interpreterObj;
        variables = variablesObj;
    }
}


