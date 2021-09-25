// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

let port;
let reader;
let lineBuffer;
let latestData = [];  // この配列にデバイスから送信した分だけデータが入る

let inputDone;
let outputDone;
let inputStream;
let outputStream;

// -----------------------------
// Web Serial
// 
// See here
// https://codelabs.developers.google.com/codelabs/web-serial#2
async function connect() {  

  const existingPermissions = await navigator.serial.getPorts();
  console.log("Existing port permissions: ", existingPermissions);
  
  const filters = [
    {
      usbVendorId: 0x0d28,
      usbProductId: 0x0204
    } //micro:bit ID.
  ];

  const options = {
    baudRate: 115200,
    dataBits: 8,
    parity: 'none',
    stopBits: 1,
    flowControl: 'none',

    // Prior to Chrome 86 these names were used.
    baudrate: 115200,
    databits: 8,
    stopbits: 1,
    rtscts: false,
  };
  port = await navigator.serial.requestPort({filters});
  console.log('Selected port', port);
  const updatedPermissions = await navigator.serial.getPorts();
  console.log("Port permissions after navigator.serial.requestPort:", updatedPermissions);
  await port.open(options);
  // CODELAB: Add code setup the output stream here.
  const encoder = new TextEncoderStream();
  outputDone = encoder.readable.pipeTo(port.writable);
  outputStream = encoder.writable;

  // CODELAB: Send CTRL-C and turn off echo on REPL
  // writeToStream('\x03', 'echo(false);');

  // CODELAB: Add code to read the stream here.
  let decoder = new TextDecoderStream();
  inputDone = port.readable.pipeTo(decoder.writable);
  inputStream = decoder.readable;

  reader = inputStream.getReader();
  readLoop();
}
/**
 * @name disconnect
 * Closes the Web Serial connection.
 */
const disconnect = async () => {
  // CODELAB: Close the input stream (reader).
  if (reader) {
    await reader.cancel();
    await inputDone.catch(() => {});
    reader = null;
    inputDone = null;
  }
  // CODELAB: Close the output stream.
  if (outputStream) {
    await outputStream.getWriter().close();
    await outputDone;
    outputStream = null;
    outputDone = null;
  }
  // CODELAB: Close the port.
  await port.close();
  port = null;
}

/**
 * @name readLoop
 * Reads data from the input stream and displays it on screen.
 */
const readLoop = async () => {
  // CODELAB: Add read loop here.
  while (true) {
    const {
      value,
      done
    } = await reader.read();
    if (value) {
      lineBuffer += value;
      let lines = lineBuffer.split('\n');
      if (lines.length > 1) {
        latestData = lineBuffer.split(',');
        lineBuffer = lines.pop().trim();
      }
    }
    if (done) {
      reader.releaseLock();
      break;
    }
  }
}

const writeToStream = (...lines) => {
  // CODELAB: Write to output stream
  const writer = outputStream.getWriter();
  lines.forEach((line) => {
    console.log('[SEND]', line);
    writer.write(line + '\n');
  });
  writer.releaseLock();
}
// -----------------------------



const s = (p) => {
  let connect_button;
  let disconnect_button;
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
    
    connect_button = p.createButton('connect');
    connect_button.position(10, 10);
    connect_button.size(100, 20);
    connect_button.mousePressed(p.connectButtonPressed);

    disconnect_button = p.createButton('disconnect');
    disconnect_button.position(110, 10);
    disconnect_button.size(100, 20);
    disconnect_button.mousePressed(p.disconnectButtonPressed);
  };

  p.draw = () => {
    p.background(0);
    //データが3つ以上あるとき
    if (latestData.length>=3) {
      let data1 = p.int(latestData[0]);  //1コ
      let data2 = p.int(latestData[1]);  //1コ
      let data3 = p.int(latestData[2]);  //1コ
      
      let xx1 = p.map(data1, -1024, 1023, 0, p.width);
      let xx2 = p.map(data2, -1024, 1023, 0, p.height);
      let xx3 = p.map(data3, -1024, 1023, 0, p.width);
      p.fill(255);
      p.noStroke();
      p.text(p.int(xx1), 10,100);
      p.text(p.int(xx2), 10,200);
      p.text(p.int(xx3), 10,300);
      p.ellipse(xx1, xx2, 20, 20);
    }
  };
  
  p.connectButtonPressed = async() =>{
    // testIt();
    if (port) {
      await disconnect();
      return;
    }
      await connect();
  }

  p.disconnectButtonPressed=()=> {
    if (!port) {
      return;
    }
    disconnect();
  }
}

const myp5 = new p5(s);

