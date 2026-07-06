/* eslint-disable react/prop-types */
import { Button, IconButton } from "@mui/material";
import Box from "@mui/material/Box";
import Modal from "@mui/material/Modal";
import CloseIcon from "@mui/icons-material/Close";
import CssTextField from "./CssTextField";

export const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxWidth: "500px",
  borderRadius: "12px",
  bgcolor: "#fff",
  padding: "3rem 2.5rem",
  textAlign: "center",
  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
  "@media (max-width: 600px)": {
    padding: "2rem 1.5rem",
    width: "95%",
    borderRadius: "8px",
  },
  "@media (max-width: 400px)": {
    padding: "1.5rem 1rem",
    width: "98%",
  },
};

export default function ModalComponent({
  open,
  handleClose,
  title,
  setTitle,
  addData,
}) {
  const handleKeyDown = (e) => {
    if (e.key === "Enter" && title.trim() !== "") {
      addData();
    }
  };

  return (
    <div>
      <Modal
        keepMounted
        open={open}
        onClose={handleClose}
        aria-labelledby="keep-mounted-modal-title"
        aria-describedby="keep-mounted-modal-description"
        sx={{
          transformStyle: "preserve-3d",
        }}
      >
        <Box
          sx={{
            ...style,
            position: "relative",
          }}
        >
          <IconButton
            onClick={handleClose}
            sx={{
              position: "absolute",
              top: "0.75rem",
              right: "0.75rem",
              color: "#6b7280",
              cursor: "pointer",
              padding: "8px",
              transition: "color 0.2s ease, background-color 0.2s ease",
              "&:hover": {
                color: "#1a1a1a",
                backgroundColor: "rgba(0, 0, 0, 0.05)",
              },
            }}
            aria-label="close"
          >
            <CloseIcon fontSize="small" />
          </IconButton>

          <CssTextField
            sx={{
              width: "100%",
              marginBottom: "2.5rem",
              "& .MuiOutlinedInput-root": {
                fontSize: { xs: "0.95rem", sm: "1rem" },
                padding: "12px 14px",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                "&:hover fieldset": {
                  borderColor: "#8a8a8a",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#4b5563",
                  boxShadow: "0 0 0 2px rgba(75, 85, 99, 0.08)",
                },
              },
              "& .MuiOutlinedInput-input::placeholder": {
                opacity: 0.6,
              },
            }}
            label="Note Title"
            id="custom-css-outlined-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            fullWidth
          />

          <Button
            variant="contained"
            sx={{
              width: "100%",
              marginTop: "1rem",
              paddingY: "0.95rem",
              fontSize: { xs: "0.9rem", sm: "1rem" },
              fontWeight: "600",
              textTransform: "none",
              backgroundColor: title.trim() === "" ? "#ccc" : "#4b5563",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              transition: "background-color 0.2s ease, box-shadow 0.2s ease",
              cursor: title.trim() === "" ? "not-allowed" : "pointer",
              "&:hover": {
                backgroundColor: title.trim() === "" ? "#ccc" : "#374151",
                boxShadow:
                  title.trim() === "" ? "none" : "0 2px 6px rgba(0,0,0,0.12)",
              },
            }}
            onClick={addData}
            disabled={title.trim() === ""}
          >
            Create Note
          </Button>
        </Box>
      </Modal>
    </div>
  );
}
