(function (){
    var PATH = 'motions/13_25.json';
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(
      75, 2, 0.1, 1000
    );


    var renderer = new THREE.WebGLRenderer({
      // alpha: true
      antialias: true
    });
    renderer.setClearColor(0x0, 1);
    renderer.setSize(1000, 1000);
    document.getElementById('container').appendChild(renderer.domElement);

    // morino saikko
    // set the light
    var ambientLight = new THREE.AmbientLight(0xffffff, 1);
    var dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(100, 100, 50);

    scene.add(dirLight, ambientLight);

    // set the camera
    camera.position.set(0, 10, 30);


    var JNT_COLOR = '#476490';
    var JNT_SCALE = 0.5;
    var ROOT_ID = 0;
    var DOF = 6;


    // A MAYBE DANGEROUS BUT USEFUL FUNCTION
    Array.prototype.resize = function(newSize, defaultValue) {
      while(newSize > this.length)
          this.push(defaultValue);
      this.length = newSize;
    }


    // the parsing order for transf is [X, Y, Z, Z_ROT, Y_ROT, X_ROT]
    function calculate_local_mat(transf){
        //fill the array
        while(DOF > transf.length)
            transf.push(0.0);

        q_rot = quat.create();
        quat.fromEuler(q_rot, transf[5], transf[4], transf[3]);
        local_mat = mat4.create();
        mat4.fromRotationTranslation(local_mat, q_rot, vec3.fromValues(transf[0], transf[1], transf[2]));
        return local_mat;
    }


        var ANIME = null;
        var BONES = null;
        var ORDER = null;
        var DELAY = 0;


    /**
    NOTE : IMPORTANT FUNC.
      one of the most important function in this script, for generating the skeletal animation from the json log file,
      which should start an animation function, after adding each node with links into the scene
    **/
    function Bone(ost, chn_num, ds, pid){
        this.world_matrix = mat4.create(); //store this because the children needs the parent's world matrix for transformation
        // the following two entries for a faster addressing of the frame data
        this.ost = ost;
        this.len = chn_num;
        this.ds = ds;
        this.pid = pid;
        this.mesh = new THREE.Mesh(new THREE.SphereGeometry(JNT_SCALE, JNT_SCALE, JNT_SCALE), new THREE.MeshPhongMaterial( { color: JNT_COLOR, specular: 0x555555, shininess: 30 } ));

    }


    function play_hone_anime(mocap, scene){
      var mapping = {};

      var internal_cnt = 0;
      var bones = {};
      var trav_order = [];
      var ost = 0;

      // SETUP the data structure and etc.
      for(var i = 0; i < mocap['hierarchy'].length; i++){
        var pid = mocap['hierarchy'][i]['parent_id'];
        var id = mocap['hierarchy'][i]['id'];
        var chn_num = mocap['hierarchy'][i]['chn_num'];
        // create my own structure wrapping the THREE.js's mesh type
        bones[id] = new Bone(ost, chn_num, mocap['hierarchy'][i]['offsets'], pid); //chn_num always greater than zero
        ost += chn_num;

        if(pid < 0) continue;
        if(!(pid in mapping)){
          mapping[pid] = [];
          internal_cnt ++;

        }
        mapping[pid].push(id);
      }

      q = [ROOT_ID];
      while(q.length != 0){
        h = q.shift();
        if(h in mapping){
          q = q.concat(mapping[h]);
        }

        trav_order.push(h);
      }

      //sorting the tree into a list of topo-order

      // calculate the inverse bind matrix with the first frame information
      var delay = mocap['motion']['frame_time'] * 1000; //let it to be of milli-sec dim
      var origin_frame = mocap['motion']['frames'][0];
      var local_mat;
      var anime = [new Array()];

      // for(var i = 0; i < trav_order.length; i++){
      //   var cur = trav_order[i];
      //   var position = vec4.fromValues(0.0, 0.0, 0.0, 1.0);
      //
      //   if(cur == ROOT_ID)
      //     local_mat = calculate_local_mat(origin_frame.slice(bones[cur].ost, bones[cur].ost + bones[cur].len));
      //   else
      //     local_mat = calculate_local_mat(bones[cur].ds.concat(origin_frame.slice(bones[cur].ost, bones[cur].ost + bones[cur].len)));
      //
      //   if(cur == ROOT_ID)
      //     bones[cur].world_matrix = local_mat;
      //   else
      //     mat4.multiply(bones[cur].world_matrix, bones[bones[cur].pid].world_matrix, local_mat);
      //
      //
      //   mat4.invert(bones[cur].inverse_bind_pos, bones[cur].world_matrix);
      //
      //
      //   vec4.transformMat4(position, position, bones[cur].world_matrix);
      //
      //   bones[cur].mesh.position.set(position[0], position[1], position[2]);
      //
      //   anime[0].push(position[0]);
      //   anime[0].push(position[1]);
      //   anime[0].push(position[2]);
      //
      //
      //
      // }



      // begin to play
      for(var i = 0; i < mocap['motion']['frames'].length; i++){
        var timer_delay = delay * i;
        var current_frame = mocap['motion']['frames'][i];
        anime.push(new Array());
        for(var j = 0; j < trav_order.length; j++){
          var cur = trav_order[j];
          var position = vec4.fromValues(0.0, 0.0, 0.0, 1.0);


          if(cur == ROOT_ID)
            local_mat = calculate_local_mat(current_frame.slice(bones[cur].ost, bones[cur].ost + bones[cur].len));
          else
            local_mat = calculate_local_mat(bones[cur].ds.concat(current_frame.slice(bones[cur].ost, bones[cur].ost + bones[cur].len)));

          if(cur == ROOT_ID)
            bones[cur].world_matrix = local_mat;
          else
            mat4.multiply(bones[cur].world_matrix, bones[bones[cur].pid].world_matrix, local_mat);

          // mat4.multiply(local_mat, bones[cur].world_matrix, bones[cur].inverse_bind_pos);

          vec4.transformMat4(position, position, bones[cur].world_matrix);

          anime[i].push(position[0]);
          anime[i].push(position[1]);
          anime[i].push(position[2]);

          if (i == 0){
            bones[cur].mesh.position.set(position[0], position[1], position[2]);
            scene.add(bones[cur].mesh);
          }


        }
      }


      BONES = bones;
      DELAY = delay;
      ORDER = trav_order;

      return anime;
    }



    // add group2 into the scene and render it , only for testing.

    /*
    var group2 = new THREE.Object3D();

    var mesh1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshLambertMaterial({color: '#d2a43f'}));
    mesh1.position.set(-1, 0, 0);

    var mesh2 = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 16), new THREE.MeshLambertMaterial({color: '#476490'}));
    mesh2.position.set(1, 0, 0);

    group2.add(mesh1, mesh2);
    scene.add(group2);
    */



    (function() {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', PATH, false);
        xhr.send();

        // the raw data for morino's application to visualize and do other things
        var mocap = JSON.parse(xhr.responseText);

        // it is easy to see the hierarchy is of the form of a tree.
        // we first construct a dictionary for each internal node mapping their id to their children for later usage
        ANIME = play_hone_anime(mocap, scene);




    }());

    var unset = true;


    function render(time) {
      requestAnimationFrame(render);
      // set the new position here
      if(ANIME != null){
        if(unset){
          render.genesis = time;
          unset = false;
        }

        ANIME.push(ANIME[ANIME.length - 1].slice(0));

        var delta = (time - render.genesis)/ DELAY;
        var ind = Math.floor(delta);
        var w_1 = delta - ind;

        ind %= (ANIME.length - 1);


        for(var j = 0; j < ORDER.length; j++){
              var cur = ORDER[j];
              var w_2 = 1 - w_1;

              BONES[cur].mesh.position.set(w_1 * ANIME[ind][3*j] + w_2 * ANIME[ind+1][3*j],
                                          w_1 * ANIME[ind][3*j+1] + w_2 * ANIME[ind+1][3*j+1],
                                        w_1 * ANIME[ind][3*j+2] + w_2 * ANIME[ind+1][3*j+2]);
       }




        // UPDATE THE LINES HERE
      }



      renderer.render(scene, camera);

    }


    /*
    BEGIN OF CODES FOR CAMERA CONTROL

    REVISED FROM https://github.com/godbasin/godbasin.github.io/blob/blog-codes/three-notes/5-add-mouse-move/js/test.js
    どうもです！・　
    */


    // 定义角度
    var theta = 0;
    // 初始化鼠标X方向移动值
    var mouseX = 0;
    var r = 1000 / (0.2* Math.PI); // 用于角度计算： 鼠标移动1000px时，角度改变2PI
    var far = 20000; // 用于照相机焦点设置（焦点距离，越大越精确）
    var move = 10; // 用于步长（照相机移动距离）


    // 添加按键时走动
    document.addEventListener('keydown', handleKeydown, false);



    // 处理按键
    function handleKeydown(e) {
        var e = e || window.event;
        var keyCode = event.keyCode ? event.keyCode : event.which ? event.which : event.charCode;

        if ('37, 38, 39, 40, 65, 87, 68, 83'.indexOf(keyCode) === -1) {
            return;
        } else {
            switch (e.keyCode) {
                case 37:
                case 65:
                    CameraMove('left');
                    break;
                case 38:
                case 87:
                    CameraMove('forward');
                    break;
                case 39:
                case 68:
                    CameraMove('right');
                    break;
                case 83:
                case 40:
                    CameraMove('backward');
                    break;
            }
        }
    }

    // 照相机移动计算
    function CameraMove(direction) {

        var oX = camera.position.x, oY = camera.position.y, oZ = camera.position.z;
        var x = oX, y = oY, z = oZ;
        switch (direction) {
            case 'left':
                x = oX - move * Math.cos(theta);
                y = oY + move * Math.sin(theta);
                break;
            case 'forward':
                z = oZ - move;
                break;
            case 'right':
                x = oX + move * Math.cos(theta);
                y = oY - move * Math.sin(theta);
                break;
            case 'backward':
                z = oZ + move;
                break;
        }
        camera.position.x = x;
        camera.position.y = y;
        camera.position.z = z;


    }

    // 初始化鼠标移动值
    function initMousePosition(e) {
        mouseX = getMousePos(e || window.event);
    }

    // 获取鼠标坐标
    function getMousePos(event) {
        var e = event || window.event;
        var scrollX = document.documentElement.scrollLeft || document.body.scrollLeft;
        var scrollY = document.documentElement.scrollTop || document.body.scrollTop;
        var x = e.pageX || e.clientX + scrollX;
        var y = e.pageY || e.clientY + scrollY;
        return { 'x': x, 'y': y };
    }

    // 更新照相机焦点
    function renderCameraLookat() {
        camera.lookAt(new THREE.Vector3(camera.position.x + far * Math.sin(theta), camera.position.y + far * Math.cos(theta), 1));
    }













    /*
    END OF CODES FOR CAMERA CONTROL
    */












    render(0);






















  })();
